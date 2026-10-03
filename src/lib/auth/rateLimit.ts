interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

const ipUserAttempts = new Map<string, RateLimitEntry>();

export function checkRateLimit(ip: string, username: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const key = `${ip}:${username}`;
  const now = Date.now();
  const entry = ipUserAttempts.get(key);

  if (!entry) {
    ipUserAttempts.set(key, { attempts: 1, firstAttemptAt: now });
    return { allowed: true };
  }

  if (now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    ipUserAttempts.set(key, { attempts: 1, firstAttemptAt: now });
    return { allowed: true };
  }

  entry.attempts += 1;
  if (entry.attempts > RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - entry.firstAttemptAt)) / 1000,
    );
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export function resetRateLimit(ip: string, username: string): void {
  ipUserAttempts.delete(`${ip}:${username}`);
}
