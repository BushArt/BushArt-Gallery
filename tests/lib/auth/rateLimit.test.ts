import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  clearRateLimits,
  rateLimitSize,
  MAX_TRACKED_PAIRS,
} from "@/lib/auth/rateLimit";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

const START = new Date("2026-01-01T12:00:00Z");

function at(offsetMs: number): void {
  vi.setSystemTime(new Date(START.getTime() + offsetMs));
}

/** Narrow the union so the blocked shape can be asserted field by field. */
function expectBlocked(result: ReturnType<typeof checkRateLimit>) {
  if (result.allowed) throw new Error("expected the attempt to be rate limited");
  return result;
}

describe("auth/rateLimit — checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first attempt for an unseen ip/username pair", () => {
    expect(checkRateLimit("10.0.0.1", "admin")).toEqual({ allowed: true });
  });

  it("counts per ip/username pair, leaving other pairs unaffected", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("10.0.0.1", "admin");
    }
    expect(checkRateLimit("10.0.0.1", "someone-else")).toEqual({ allowed: true });
  });

  it("allows every attempt up to the limit", () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      expect(checkRateLimit("10.0.0.2", "admin")).toEqual({ allowed: true });
    }
  });

  it("blocks the attempt past the limit and reports the remaining window", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("10.0.0.3", "admin");
    }
    at(30_000);

    const result = expectBlocked(checkRateLimit("10.0.0.3", "admin"));

    expect(result.retryAfterSeconds).toBe(30);
  });

  it("keeps reporting a shrinking retryAfterSeconds while blocked", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("10.0.0.4", "admin");
    }
    at(45_000);
    expect(expectBlocked(checkRateLimit("10.0.0.4", "admin")).retryAfterSeconds).toBe(15);

    at(50_000);
    expect(expectBlocked(checkRateLimit("10.0.0.4", "admin")).retryAfterSeconds).toBe(10);
  });

  it("starts a fresh window once the previous one has elapsed", () => {
    checkRateLimit("10.0.0.5", "admin");
    at(30_000);
    checkRateLimit("10.0.0.5", "admin");

    // Past the window measured from the *first* attempt, so the counter resets
    // and the full allowance is available again.
    at(WINDOW_MS + 1);
    expect(checkRateLimit("10.0.0.5", "admin")).toEqual({ allowed: true });
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      expect(checkRateLimit("10.0.0.5", "admin")).toEqual({ allowed: true });
    }
  });
});

describe("auth/rateLimit — resetRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears a blocked counter so the next attempt is allowed", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("10.0.0.6", "admin");
    }
    expect(expectBlocked(checkRateLimit("10.0.0.6", "admin"))).toBeDefined();

    resetRateLimit("10.0.0.6", "admin");

    expect(checkRateLimit("10.0.0.6", "admin")).toEqual({ allowed: true });
  });

  it("only clears the matching ip/username pair", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("10.0.0.7", "admin");
    }

    resetRateLimit("10.0.0.7", "different-user");

    expect(expectBlocked(checkRateLimit("10.0.0.7", "admin"))).toBeDefined();
  });
});

describe("auth/rateLimit — bounded memory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    clearRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearRateLimits();
  });

  it("never tracks more than MAX_TRACKED_PAIRS entries", () => {
    expect(MAX_TRACKED_PAIRS).toBeGreaterThan(0);

    for (let i = 0; i < MAX_TRACKED_PAIRS + 250; i++) {
      checkRateLimit("10.0.0.1", `user-${i}`);
    }

    expect(rateLimitSize()).toBeLessThanOrEqual(MAX_TRACKED_PAIRS);
  });

  it("evicts the least-recently-used pair when the cap is reached", () => {
    // Saturate a single pair, then flood with fresh ones.
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("10.0.0.2", "admin");
    }
    expect(expectBlocked(checkRateLimit("10.0.0.2", "admin"))).toBeDefined();

    for (let i = 0; i < MAX_TRACKED_PAIRS; i++) {
      checkRateLimit("10.0.0.2", `flood-${i}`);
    }

    // The idle pair was evicted to make room, so it starts a fresh counter.
    expect(checkRateLimit("10.0.0.2", "admin")).toEqual({ allowed: true });
    expect(rateLimitSize()).toBeLessThanOrEqual(MAX_TRACKED_PAIRS);
  });

  it("keeps an actively-attempted pair resident through a flood of newer pairs", () => {
    // Saturate `admin` — it is now blocked.
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("10.0.0.3", "admin");
    }
    expect(expectBlocked(checkRateLimit("10.0.0.3", "admin"))).toBeDefined();

    // Half the cap of unrelated traffic, then touch the blocked pair again so
    // it moves to the newest position, then the other half.
    for (let i = 0; i < MAX_TRACKED_PAIRS / 2; i++) {
      checkRateLimit("10.0.0.3", `flood-a-${i}`);
    }
    expect(expectBlocked(checkRateLimit("10.0.0.3", "admin"))).toBeDefined();
    for (let i = 0; i < MAX_TRACKED_PAIRS / 2; i++) {
      checkRateLimit("10.0.0.3", `flood-b-${i}`);
    }

    // Recency kept `admin` alive: flooding the map did not reset its counter.
    expect(expectBlocked(checkRateLimit("10.0.0.3", "admin"))).toBeDefined();
  });

  it("sweeps expired entries instead of waiting for the size cap", () => {
    // An attacker who sends a trickle of requests never trips the cap, yet
    // would otherwise leave a permanent entry behind for every one of them.
    checkRateLimit("10.0.0.4", "slow-drip");
    expect(rateLimitSize()).toBe(1);

    // Move past the window; the pair is now expired but still resident.
    at(WINDOW_MS + 1);

    // Any later call sweeps the whole map before recording its own entry.
    checkRateLimit("10.0.0.5", "other");

    expect(rateLimitSize()).toBe(1);
    expect(checkRateLimit("10.0.0.4", "slow-drip")).toEqual({ allowed: true });
  });

  it("does not sweep entries whose window has not elapsed", () => {
    checkRateLimit("10.0.0.6", "admin");
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("10.0.0.6", "admin");
    }
    expect(expectBlocked(checkRateLimit("10.0.0.6", "admin"))).toBeDefined();

    at(45_000);
    checkRateLimit("10.0.0.7", "other");

    // Still inside its window, so it must not have been swept away.
    expect(expectBlocked(checkRateLimit("10.0.0.6", "admin"))).toBeDefined();
  });
});