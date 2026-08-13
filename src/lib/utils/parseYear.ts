/**
 * Parse a year filter from URL or user input.
 * Returns null for empty, non-numeric, or non-finite values.
 */
export function parseYearParam(raw: string | null): number | null {
  if (raw === null || !raw.trim()) return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

/** Alias for typed input fields (same validation as URL params). */
export function parseYearInput(value: string): number | null {
  return parseYearParam(value);
}
