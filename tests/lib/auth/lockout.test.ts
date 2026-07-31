import { describe, it, expect } from "vitest";
import {
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
  isLocked,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from "@/lib/auth/lockout";

describe("auth/lockout — isLocked", () => {
  it("returns false when lockUntil is null", () => {
    expect(isLocked(null, new Date())).toBe(false);
  });

  it("returns true when lockUntil is in the future", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const lockUntil = new Date("2026-01-01T12:10:00Z");
    expect(isLocked(lockUntil, now)).toBe(true);
  });

  it("returns false when lockUntil is in the past (lock expired)", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const lockUntil = new Date("2026-01-01T11:50:00Z");
    expect(isLocked(lockUntil, now)).toBe(false);
  });

  it("returns false when lockUntil equals now exactly (lock just expired)", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const lockUntil = new Date("2026-01-01T12:00:00Z");
    expect(isLocked(lockUntil, now)).toBe(false);
  });
});

describe("auth/lockout — recordFailedAttempt", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("increments attempts from 0 to 1 without locking", () => {
    const result = recordFailedAttempt(
      { failedLoginAttempts: 0, lockUntil: null },
      now,
    );
    expect(result.failedLoginAttempts).toBe(1);
    expect(result.lockUntil).toBeNull();
  });

  it("increments attempts from 1 to 2 without locking", () => {
    const result = recordFailedAttempt(
      { failedLoginAttempts: 1, lockUntil: null },
      now,
    );
    expect(result.failedLoginAttempts).toBe(2);
    expect(result.lockUntil).toBeNull();
  });

  it("increments attempts from 2 to 3 without locking", () => {
    const result = recordFailedAttempt(
      { failedLoginAttempts: 2, lockUntil: null },
      now,
    );
    expect(result.failedLoginAttempts).toBe(3);
    expect(result.lockUntil).toBeNull();
  });

  it("increments attempts from 3 to 4 without locking", () => {
    const result = recordFailedAttempt(
      { failedLoginAttempts: 3, lockUntil: null },
      now,
    );
    expect(result.failedLoginAttempts).toBe(4);
    expect(result.lockUntil).toBeNull();
  });

  it("locks on the 5th consecutive failure (attempts 4 → 5)", () => {
    const result = recordFailedAttempt(
      { failedLoginAttempts: 4, lockUntil: null },
      now,
    );
    expect(result.failedLoginAttempts).toBe(5);
    expect(result.lockUntil).not.toBeNull();
    // lockUntil should be exactly now + 15 minutes
    expect(result.lockUntil!.getTime()).toBe(
      now.getTime() + LOCK_DURATION_MS,
    );
  });

  it("sets lockUntil to exactly 15 minutes from now", () => {
    const result = recordFailedAttempt(
      { failedLoginAttempts: 4, lockUntil: null },
      now,
    );
    const expectedLock = new Date(now.getTime() + 15 * 60 * 1000);
    expect(result.lockUntil!.toISOString()).toBe(expectedLock.toISOString());
  });

  it("does not extend lock on 6th attempt while already locked", () => {
    const lockUntil = new Date("2026-01-01T12:10:00Z");
    const result = recordFailedAttempt(
      { failedLoginAttempts: 5, lockUntil },
      now,
    );
    expect(result.failedLoginAttempts).toBe(6);
    // lockUntil should be preserved, not refreshed
    expect(result.lockUntil).toEqual(lockUntil);
  });

  it("does not extend lock on 7th attempt while already locked", () => {
    const lockUntil = new Date("2026-01-01T12:10:00Z");
    const result = recordFailedAttempt(
      { failedLoginAttempts: 6, lockUntil },
      now,
    );
    expect(result.failedLoginAttempts).toBe(7);
    expect(result.lockUntil).toEqual(lockUntil);
  });

  it("re-locks immediately when lock has expired but count is still ≥ 5", () => {
    // Lock expired 5 minutes ago, but failedLoginAttempts was never reset
    const expiredLock = new Date("2026-01-01T11:55:00Z");
    const result = recordFailedAttempt(
      { failedLoginAttempts: 5, lockUntil: expiredLock },
      now,
    );
    expect(result.failedLoginAttempts).toBe(6);
    expect(result.lockUntil).not.toBeNull();
    // New lock is now + 15 minutes
    expect(result.lockUntil!.getTime()).toBe(now.getTime() + LOCK_DURATION_MS);
  });

  it("does not lock when lock expired and count is below threshold", () => {
    const expiredLock = new Date("2026-01-01T11:55:00Z");
    const result = recordFailedAttempt(
      { failedLoginAttempts: 2, lockUntil: expiredLock },
      now,
    );
    expect(result.failedLoginAttempts).toBe(3);
    expect(result.lockUntil).toBeNull();
  });
});

describe("auth/lockout — recordSuccessfulLogin", () => {
  it("resets failedLoginAttempts to 0", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const result = recordSuccessfulLogin(now);
    expect(result.failedLoginAttempts).toBe(0);
  });

  it("clears lockUntil to null", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const result = recordSuccessfulLogin(now);
    expect(result.lockUntil).toBeNull();
  });

  it("sets lastLoginAt to now", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const result = recordSuccessfulLogin(now);
    expect(result.lastLoginAt).toEqual(now);
  });

  it("resets even from a locked state with 5 failures", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const result = recordSuccessfulLogin(now);
    // Regardless of prior state, successful login always resets
    expect(result.failedLoginAttempts).toBe(0);
    expect(result.lockUntil).toBeNull();
    expect(result.lastLoginAt).toEqual(now);
  });
});

describe("auth/lockout — constants", () => {
  it("MAX_FAILED_ATTEMPTS is 5", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
  });

  it("LOCK_DURATION_MS is 15 minutes in milliseconds", () => {
    expect(LOCK_DURATION_MS).toBe(15 * 60 * 1000);
    expect(LOCK_DURATION_MS).toBe(900000);
  });
});