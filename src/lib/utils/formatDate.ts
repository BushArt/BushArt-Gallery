/** Format an ISO date string for display (e.g. "Mar 2024"). */
export function formatCompletionDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
