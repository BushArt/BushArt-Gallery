/**
 * Whether boot-time index verification has completed.
 *
 * Stored on `globalThis` rather than in a module-level `let` for the same
 * reason `lib/db/mongodb.ts` keeps its client promise there: `instrumentation.ts`
 * and the Route Handlers are separate module graphs in a Next.js build, so a
 * module-scoped binding set by `register()` is not reliably observed by
 * `requireAdmin()`, which imports this module from the route bundle. When the
 * flag failed to cross that boundary, `requireAdmin()` fail-closed and returned
 * 503 for every admin request — an app-wide admin lockout rather than the
 * intended narrow boot-race guard.
 *
 * `globalThis` is the one object shared across every module graph in the same
 * process.
 */
declare global {
  var _bushartIndexesVerified: boolean | undefined;
}

export function setIndexesVerified(): void {
  globalThis._bushartIndexesVerified = true;
}

export function areIndexesVerified(): boolean {
  return globalThis._bushartIndexesVerified === true;
}

/**
 * Reset the flag. Exists for tests, which share one process across suites and
 * would otherwise leak a verified state from one file into the next.
 */
export function resetIndexesVerified(): void {
  globalThis._bushartIndexesVerified = undefined;
}