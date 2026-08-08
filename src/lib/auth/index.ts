// Public barrel export for the auth module.
// Other lib/ subdirectories follow this convention; auth/ was missed during Phase 2.

export { signToken, verifyToken, TOKEN_EXPIRY_SECONDS, type TokenPayload } from "./jwt";
export { verifyPassword, hashPassword } from "./password";
export {
  isLocked,
  recordFailedAttempt,
  recordSuccessfulLogin,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
} from "./lockout";
export { requireAdmin } from "./guard";