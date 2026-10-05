import { describe, it, expect, vi } from "vitest";
import { runWithTransaction, isTransactionUnsupported } from "@/lib/db/transaction";

// ── Session doubles ─────────────────────────────────────────────────────────

interface FakeSessionOptions {
  startTransactionError?: unknown;
  commitErrors?: unknown[];
}

function makeFakeSession(options: FakeSessionOptions = {}) {
  const commitErrors = [...(options.commitErrors ?? [])];

  return {
    startTransaction: vi.fn(() => {
      if (options.startTransactionError) throw options.startTransactionError;
    }),
    commitTransaction: vi.fn(async () => {
      const next = commitErrors.shift();
      if (next) throw next;
    }),
    abortTransaction: vi.fn(async () => undefined),
    endSession: vi.fn(async () => undefined),
  };
}

/** A driver error carrying spec error labels, as the real driver produces. */
function labelled(message: string, label: string) {
  const error = new Error(message) as Error & {
    hasErrorLabel: (l: string) => boolean;
    errorLabels: string[];
  };
  error.hasErrorLabel = (l: string) => l === label;
  error.errorLabels = [label];
  return error;
}

const UNSUPPORTED = new Error(
  "Transaction numbers are only allowed on a replica set member or mongos",
);

// ── Tests ────────────────────────────────────────────────────────────────────

describe("isTransactionUnsupported", () => {
  it("matches the standalone rejection message", () => {
    expect(isTransactionUnsupported(UNSUPPORTED)).toBe(true);
  });

  it("matches MongoDB error code 20 for a transactional operation", () => {
    const error = Object.assign(new Error("transactions are not supported"), { code: 20 });
    expect(isTransactionUnsupported(error)).toBe(true);
  });

  it("does not match an unrelated failure", () => {
    expect(isTransactionUnsupported(new Error("document validation failed"))).toBe(false);
    expect(isTransactionUnsupported(null)).toBe(false);
  });
});

describe("runWithTransaction", () => {
  it("runs fn with a session and commits, returning its value", async () => {
    const session = makeFakeSession();
    const fn = vi.fn(async () => "ok");

    await expect(
      runWithTransaction(async () => session as never, fn as never),
    ).resolves.toBe("ok");

    expect(fn).toHaveBeenCalledWith(session);
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    expect(session.abortTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it("falls back to a non-transactional run when startTransaction is unsupported", async () => {
    const session = makeFakeSession({ startTransactionError: UNSUPPORTED });
    const fn = vi.fn(async () => "fallback");

    await expect(
      runWithTransaction(async () => session as never, fn as never),
    ).resolves.toBe("fallback");

    // No session, and nothing committed — the transaction never began.
    expect(fn).toHaveBeenCalledWith(undefined);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it("falls back when the server rejects the first transactional write", async () => {
    const session = makeFakeSession();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(UNSUPPORTED)
      .mockResolvedValueOnce("no-transaction");

    await expect(
      runWithTransaction(async () => session as never, fn as never),
    ).resolves.toBe("no-transaction");

    expect(fn).toHaveBeenNthCalledWith(1, session);
    expect(fn).toHaveBeenNthCalledWith(2, undefined);
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
  });

  it("retries a transient transaction failure instead of surfacing a 500", async () => {
    // The driver-spec case: on a replica set a network blip marks the error
    // retryable. Previously the admin saw a failure for a write that may well
    // have committed.
    const session = makeFakeSession();
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(labelled("write concern error", "TransientTransactionError"))
      .mockResolvedValueOnce("committed");

    await expect(
      runWithTransaction(async () => session as never, fn as never),
    ).resolves.toBe("committed");

    expect(fn).toHaveBeenCalledTimes(2);
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.startTransaction).toHaveBeenCalledTimes(2);
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it("gives up after the attempt ceiling rather than retrying forever", async () => {
    const session = makeFakeSession();
    const fn = vi.fn(async () => {
      throw labelled("still transient", "TransientTransactionError");
    });

    await expect(
      runWithTransaction(async () => session as never, fn as never),
    ).rejects.toThrow("still transient");

    expect(fn).toHaveBeenCalledTimes(3);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it("retries the commit when its outcome is unknown", async () => {
    // Losing the commit reply must not be reported as failure: the write may
    // already have landed. Retrying the commit is idempotent by txn number.
    const session = makeFakeSession({
      commitErrors: [labelled("commit reply lost", "UnknownTransactionCommitResult")],
    });
    const fn = vi.fn(async () => "done");

    await expect(
      runWithTransaction(async () => session as never, fn as never),
    ).resolves.toBe("done");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).toHaveBeenCalledTimes(2);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it("rethrows a non-retryable failure immediately", async () => {
    const session = makeFakeSession();
    const fn = vi.fn(async () => {
      throw new Error("duplicate key");
    });

    await expect(
      runWithTransaction(async () => session as never, fn as never),
    ).rejects.toThrow("duplicate key");

    // No pointless retry for an error that will never succeed.
    expect(fn).toHaveBeenCalledTimes(1);
    expect(session.commitTransaction).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it("always ends the session, even when the commit ultimately fails", async () => {
    const session = makeFakeSession({
      commitErrors: [
        labelled("lost", "UnknownTransactionCommitResult"),
        labelled("lost", "UnknownTransactionCommitResult"),
        labelled("lost", "UnknownTransactionCommitResult"),
      ],
    });
    const fn = vi.fn(async () => "done");

    await expect(
      runWithTransaction(async () => session as never, fn as never),
    ).rejects.toThrow("lost");

    expect(session.commitTransaction).toHaveBeenCalledTimes(3);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});