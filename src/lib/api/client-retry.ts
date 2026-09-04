/**
 * Shared client-side retryability semantics, aligned with the
 * `isRetryable` logic in `useArtwork`/`useArtworks`: network-level
 * failures (no status captured) and 5xx responses are retryable;
 * terminal 4xx responses are not.
 */
export function isRetryableStatus(status?: number): boolean {
  if (status === undefined) return true;
  return status >= 500;
}

export function statusFromError(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined;
  const status = (error as Error & { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}
