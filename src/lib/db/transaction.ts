import type { ClientSession } from "mongodb";
import { warn } from "@/lib/logger";

/**
 * Transaction execution with retry and graceful degradation.
 *
 * MongoDB transactions require a replica set (or sharded cluster). Production
 * runs on Atlas — a replica set — so the transactional path always applies
 * there. A standalone `mongod` (the CI service, and some local setups) rejects
 * transactional operations with "Transaction numbers are only allowed on a
 * replica set member or mongos". Rather than surface a 500 for an admin write,
 * that case falls back to a non-transactional run and logs a warning so the
 * degradation is visible.
 *
 * Two independent concerns are handled here, and conflating them is what made
 * the original version unsafe:
 *
 * 1. **Transient errors** (`TransientTransactionError`, and `UnknownTransactionCommitResult`
 *    on commit) are part of the driver spec's retry contract. On a replica set
 *    a brief network blip raises them. Without retries the admin saw a 500 for a
 *    write that may well have committed — the worst possible outcome, since the
 *    obvious "just retry" is then ambiguous.
 *
 * 2. **Unsupported transactions** (standalone mongod) fall back to a
 *    non-transactional run. See the precondition note on `fn` below.
 *
 * Kept in its own module so the test harness can reuse the exact production
 * logic for `withTransaction` rather than reimplementing it.
 */

/** Upper bound on attempts for the whole transaction. */
const MAX_TRANSACTION_ATTEMPTS = 3;

/** True when the server rejects transactions because it is not a replica set. */
export function isTransactionUnsupported(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (
    /transaction numbers are only allowed|replica set member or mongos|does not support transactions|transactions are not supported/i.test(
      error.message,
    )
  ) {
    return true;
  }
  // Standalone MongoDB returns IllegalOperation (code 20) for a transactional op.
  return (
    (error as { code?: unknown }).code === 20 && /transaction/i.test(error.message)
  );
}

/**
 * True when the error carries the given driver error label.
 *
 * `hasErrorLabel` is the spec-blessed check; `errorLabels` and a message match
 * are fallbacks for driver versions or serialisation boundaries that drop the
 * method.
 */
function hasLabel(error: unknown, label: string): boolean {
  if (typeof error !== "object" || error === null) return false;
  const labelled = error as {
    hasErrorLabel?: (l: string) => boolean;
    errorLabels?: string[];
    message?: string;
  };

  if (typeof labelled.hasErrorLabel === "function" && labelled.hasErrorLabel(label)) {
    return true;
  }
  if (Array.isArray(labelled.errorLabels) && labelled.errorLabels.includes(label)) {
    return true;
  }
  return new RegExp(label.replace(/([A-Z])/g, " $1"), "i").test(labelled.message ?? "");
}

/**
 * True only when re-running the transaction body is safe.
 *
 * Deliberately excludes `UnknownTransactionCommitResult`: that label means the
 * commit may already have landed, so replaying the body could apply the same
 * writes twice. Those errors are handled inside `commitWithRetry`, which
 * re-issues only the commit.
 */
function isTransientTransactionError(error: unknown): boolean {
  return hasLabel(error, "TransientTransactionError");
}

/**
 * Run `fn` inside a session/transaction created by `createSession`, retrying
 * transient failures and falling back to a non-transactional run when the
 * deployment does not support transactions at all.
 *
 * The callback receives the session (or `undefined` on the fallback path) and
 * MUST pass it to every driver call so the whole unit commits or aborts
 * together.
 *
 * **Precondition for the fallback path:** `fn` must perform no work that
 * survives a failed transaction other than its session-scoped database calls.
 * That holds for every current caller, whose first statement inside the callback
 * is a write carrying the session, so a standalone rejection aborts before
 * anything is applied. It is *not* automatically true: reads do not carry a
 * transaction number, so a callback can succeed at reading and only then fail on
 * its first write. Adding a non-session write or an external side effect to
 * `fn` would make the fallback apply it twice.
 */
export async function runWithTransaction<T>(
  createSession: () => Promise<ClientSession>,
  fn: (session: ClientSession | undefined) => Promise<T>,
): Promise<T> {
  const session = await createSession();

  let lastError: unknown;

  try {
    try {
      session.startTransaction();
    } catch (error) {
      if (!isTransactionUnsupported(error)) throw error;
      // The transaction never started, so nothing has been applied and it is
      // safe to run the work without one. The `finally` below ends the session,
      // so it must not be ended here as well.
      warn("MongoDB transactions unsupported; running without a transaction");
      return fn(undefined);
    }

    for (let attempt = 1; ; attempt++) {
      try {
        const result = await fn(session);
        await commitWithRetry(session);
        return result;
      } catch (error) {
        lastError = error;
        await session.abortTransaction().catch(() => undefined);

        // The deployment cannot do transactions at all: fall back rather than
        // failing an admin write. Safe under the documented precondition.
        if (isTransactionUnsupported(error)) {
          warn("MongoDB transactions unsupported; retrying without a transaction");
          return fn(undefined);
        }

        // Only a *transient* error justifies replaying the body. A commit whose
        // outcome is unknown may already have been applied, so replaying `fn`
        // could double-write — that case is handled inside commitWithRetry and
        // must reach the caller unchanged.
        if (!isTransientTransactionError(error) || attempt >= MAX_TRANSACTION_ATTEMPTS) {
          throw error;
        }

        warn("Retrying transaction after a transient failure", { attempt });
        session.startTransaction();
      }
    }
  } finally {
    await session.endSession();
  }

  // Unreachable: the loop either returns or throws.
  throw lastError;
}

/**
 * Commit, retrying when the outcome is genuinely unknown.
 *
 * This is the case that matters most: `UnknownTransactionCommitResult` means
 * the server may have committed but the reply was lost. Reporting failure would
 * make the admin retry a write that already succeeded; retrying the commit is
 * the only safe answer, and it is idempotent by transaction number.
 */
async function commitWithRetry(session: ClientSession): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await session.commitTransaction();
      return;
    } catch (error) {
      const labelled =
        typeof error === "object" && error !== null && "hasErrorLabel" in error
          ? (error as { hasErrorLabel: (l: string) => boolean })
          : null;

      const outcomeUnknown =
        (labelled?.hasErrorLabel("UnknownTransactionCommitResult") ?? false) ||
        /unknown transaction commit result/i.test(
          error instanceof Error ? error.message : "",
        );

      if (!outcomeUnknown || attempt >= MAX_TRANSACTION_ATTEMPTS) {
        throw error;
      }
      warn("Commit outcome unknown; retrying commit", { attempt });
    }
  }
}