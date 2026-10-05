interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

/**
 * Hard bound on tracked `ip:username` pairs.
 *
 * Without a cap this Map grows without limit: entries were only removed by
 * `resetRateLimit`, which runs on a *successful* login, so every pair an
 * attacker invents by cycling usernames stayed resident for the life of the
 * process — a straightforward memory-exhaustion vector on a long-lived server.
 *
 * 10_000 pairs is far beyond what a single-artist site generates (one admin
 * account, a handful of real client IPs), so eviction only ever fires under
 * abuse. Losing an entry costs at most one 60s counter: the account lockout in
 * `lockout.ts` (5 failures → 15-minute lock, persisted in MongoDB) is the
 * primary brute-force control and is untouched by eviction.
 */
export const MAX_TRACKED_PAIRS = 10_000;

/**
 * Per-process, in-memory by design.
 *
 * This deliberately trades distribution for zero dependencies: there is no
 * shared store, so on a multi-instance deployment (Render can run more than
 * one) the effective allowance is `10 × instance count`. That is acceptable
 * because the real protection is the DB-backed lockout; this limiter is
 * best-effort defence against enumeration and flood. A shared counter store
 * would be the next step if instance count ever matters.
 */
const ipUserAttempts = new Map<string, RateLimitEntry>();

/** Amortised sweep bookkeeping — see `sweepExpired`. */
let lastSweptAt = 0;

function isExpired(entry: RateLimitEntry, now: number): boolean {
  return now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS;
}

/**
 * Drop entries whose window has elapsed, at most once per window.
 *
 * Eviction alone is not enough: an attacker sending one request a minute would
 * never trip the size cap, yet would still accumulate a permanent entry every
 * minute. Sweeping on a timer bounds growth to whatever was created inside a
 * single window, regardless of how slowly requests arrive. The `lastSweptAt`
 * guard keeps the scan off the hot path — it runs once per window, not once
 * per request.
 */
function sweepExpired(now: number): void {
  if (now - lastSweptAt < RATE_LIMIT_WINDOW_MS) return;
  lastSweptAt = now;

  for (const [key, entry] of ipUserAttempts) {
    if (isExpired(entry, now)) ipUserAttempts.delete(key);
  }
}

/**
 * Enforce the size cap by evicting the least-recently-used pair.
 *
 * Map preserves insertion order, so `keys().next()` is the LRU pair — provided
 * every hit re-inserts (see `store`), which makes insertion order track
 * recency rather than first sighting. A pair under active attack is therefore
 * always the last one evicted.
 */
function evictToCap(): void {
  while (ipUserAttempts.size >= MAX_TRACKED_PAIRS) {
    const oldest = ipUserAttempts.keys().next();
    if (oldest.done) break;
    ipUserAttempts.delete(oldest.value);
  }
}

/** Insert or refresh so insertion order reflects recency for `evictToCap`. */
function store(key: string, entry: RateLimitEntry): void {
  ipUserAttempts.delete(key);
  ipUserAttempts.set(key, entry);
}

export function checkRateLimit(
  ip: string,
  username: string,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const key = `${ip}:${username}`;
  const now = Date.now();

  sweepExpired(now);

  const entry = ipUserAttempts.get(key);

  if (!entry) {
    evictToCap();
    store(key, { attempts: 1, firstAttemptAt: now });
    return { allowed: true };
  }

  if (isExpired(entry, now)) {
    // Previous window elapsed: start a fresh one from now, and refresh
    // recency so this pair is not the first candidate for eviction.
    store(key, { attempts: 1, firstAttemptAt: now });
    return { allowed: true };
  }

  entry.attempts += 1;
  // Re-insert to move this pair to the newest position before the cap can be
  // reached again — an attacker must outrun 10_000 fresh pairs between two
  // attempts on this one to evict it.
  store(key, entry);

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

/** Number of pairs currently tracked. Exposed so tests can assert the bound. */
export function rateLimitSize(): number {
  return ipUserAttempts.size;
}

/** Drop all state. Exposed so tests start from a known-clean limiter. */
export function clearRateLimits(): void {
  ipUserAttempts.clear();
  lastSweptAt = 0;
}
