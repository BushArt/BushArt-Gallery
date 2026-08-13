import type { FilterState } from "@/hooks/useFilters";

/**
 * Serialize filter state to URL search params (shared by useFilters and useArtworks).
 */
export function filtersToSearchParams(
  filters: FilterState,
  cursor?: string,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.year !== null && filters.year !== undefined) {
    params.set("year", String(filters.year));
  }
  if (filters.medium) params.set("medium", filters.medium);
  if (filters.type) params.set("type", filters.type);
  params.set("nsfw", filters.nsfw);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (cursor) params.set("cursor", cursor);
  return params;
}
