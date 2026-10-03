import type { ClientSession } from "mongodb";
import { warn } from "@/lib/logger";

/**
 * Transaction execution with graceful degradation.
 *
 * MongoDB transactions require a replica set (or sharded cluster). Production
 * runs on Atlas — a replica set — so the transactional path always applies
 * there. A standalone `mongod` (the CI service, and some local setups) rejects
 * the first transactional operation with "Transaction numbers are only allowed
 * on a replica set member or mongos". Rather than surface a 500 for an admin
 * write, we retry the same work without a session and log a warning so the
 * degradation is visible. On the fallback path nothing has been applied yet
 * (the server rejected the operation), so the retry cannot duplicate effects.
 *
 * Kept in its own module so the test harness can reuse the exact production
 * logic for `withTransaction` rather than reimplementing it.
 */

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
 * Run `fn` inside a session/transaction created by `createSession`, falling
 * back to a non-transactional run when the deployment does not support
 * transactions.
 *
 * The callback receives the session (or `undefined` on the fallback path) and
 * MUST pass it to every driver call so the whole unit commits or aborts
 * together.
 */
export async function runWithTransaction<T>(
  createSession: () => Promise<ClientSession>,
  fn: (session: ClientSession | undefined) => Promise<T>,
): Promise<T> {
  const session = await createSession();

  try {
    session.startTransaction();
  } catch (error) {
    await session.endSession().catch(() => undefined);
    if (isTransactionUnsupported(error)) {
      warn("MongoDB transactions unsupported; running without a transaction");
      return fn(undefined);
    }
    throw error;
  }

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction().catch(() => undefined);
    if (isTransactionUnsupported(error)) {
      warn("MongoDB transactions unsupported; retrying without a transaction");
      return fn(undefined);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
