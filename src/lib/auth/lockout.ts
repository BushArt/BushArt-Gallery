/**
 * Brute-force lockout state machine.
 *
 * Pure functions — no DB calls, no side effects. Callers pass the current
 * admin lockout state and a `Date` (typically `new Date()` at runtime), and
 * receive the next state to persist via `updateLoginState()`.
 *
 * Spec: `02-Technical-Specification.md` §4 — "Five consecutive failures locks
 * the account for 15 minutes."
 */

/** Maximum consecutive failed attempts before the account locks. */
export const MAX_FAILED_ATTEMPTS = 5;

/** Lock duration in milliseconds (15 minutes). */
export const LOCK_DURATION_MS = 15 * 60 * 1000;

/** Input state for the state machine — matches the `admins` doc fields. */
export interface LockoutState {
  failedLoginAttempts: number;
  lockUntil: Date | null;
}

/** Result of recording a successful login — resets all lockout fields. */
export interface SuccessfulLoginResult {
  failedLoginAttempts: 0;
  lockUntil: null;
  lastLoginAt: Date;
}

/**
 * Returns `true` if the account is currently locked (i.e. `lockUntil` is set
 * and lies in the future relative to `now`). A `null` `lockUntil` or an
 * expired lock means the account is not locked.
 */
export function isLocked(lockUntil: Date | null, now: Date): boolean {
  if (lockUntil === null) return false;
  return lockUntil.getTime() > now.getTime();
}

/**
 * Records a failed login attempt and returns the next lockout state.
 *
 * - Increments `failedLoginAttempts` by 1.
 * - If the new count reaches `MAX_FAILED_ATTEMPTS`, sets `lockUntil` to
 *   `now + LOCK_DURATION_MS`.
 * - If the account is already locked (count ≥ 5 and lock not expired), the
 *   lock is **not** extended — the existing `lockUntil` is preserved.
 * - If a previous lock has expired, `failedLoginAttempts` is reset to 0
 *   before counting the current attempt.
 */
export function recordFailedAttempt(
  state: LockoutState,
  now: Date,
): LockoutState {
  if (isLocked(state.lockUntil, now)) {
    return {
      failedLoginAttempts: state.failedLoginAttempts + 1,
      lockUntil: state.lockUntil,
    };
  }

  if (state.lockUntil !== null && state.lockUntil.getTime() <= now.getTime()) {
    return recordFailedAttempt({ failedLoginAttempts: 0, lockUntil: null }, now);
  }

  const newAttempts = state.failedLoginAttempts + 1;

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginAttempts: newAttempts,
      lockUntil: new Date(now.getTime() + LOCK_DURATION_MS),
    };
  }

  return {
    failedLoginAttempts: newAttempts,
    lockUntil: null,
  };
}

/**
 * Records a successful login — resets `failedLoginAttempts` to 0, clears
 * `lockUntil`, and sets `lastLoginAt` to `now`.
 */
export function recordSuccessfulLogin(now: Date): SuccessfulLoginResult {
  return {
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: now,
  };
}
