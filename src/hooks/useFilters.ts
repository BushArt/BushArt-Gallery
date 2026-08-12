"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const NSFW_STORAGE_KEY = "bushart-nsfw";

export interface FilterState {
  tags: string[];
  year: number | null;
  medium: string;
  type: "" | "personal" | "commission";
  nsfw: "include" | "exclude";
  sort: "recent" | "oldest";
}

const DEFAULT_FILTERS: FilterState = {
  tags: [],
  year: null,
  medium: "",
  type: "",
  nsfw: "exclude",
  sort: "recent",
};

function readNsfwFromStorage(): "include" | "exclude" {
  if (typeof window === "undefined") return "exclude";
  const stored = localStorage.getItem(NSFW_STORAGE_KEY);
  return stored === "include" ? "include" : "exclude";
}

function parseFiltersFromParams(searchParams: URLSearchParams, nsfwDefault: "include" | "exclude"): FilterState {
  const tagsRaw = searchParams.get("tags");
  const yearRaw = searchParams.get("year");
  const typeRaw = searchParams.get("type");
  const nsfwRaw = searchParams.get("nsfw");
  const sortRaw = searchParams.get("sort");

  return {
    tags: tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
    year: yearRaw ? Number(yearRaw) : null,
    medium: searchParams.get("medium") ?? "",
    type: typeRaw === "personal" || typeRaw === "commission" ? typeRaw : "",
    nsfw: nsfwRaw === "include" || nsfwRaw === "exclude" ? nsfwRaw : nsfwDefault,
    sort: sortRaw === "oldest" ? "oldest" : "recent",
  };
}

function filtersToParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.year) params.set("year", String(filters.year));
  if (filters.medium) params.set("medium", filters.medium);
  if (filters.type) params.set("type", filters.type);
  params.set("nsfw", filters.nsfw);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  return params;
}

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [nsfwDefault] = useState(readNsfwFromStorage);

  const filters = useMemo(
    () => parseFiltersFromParams(searchParams, nsfwDefault),
    [searchParams, nsfwDefault],
  );

  const setFilters = useCallback(
    (next: Partial<FilterState>) => {
      const merged = { ...filters, ...next };
      if (next.nsfw !== undefined) {
        localStorage.setItem(NSFW_STORAGE_KEY, merged.nsfw);
      }
      const params = filtersToParams(merged);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  // Sync NSFW from localStorage into URL on first mount when URL has no nsfw param
  useEffect(() => {
    if (!searchParams.has("nsfw") && nsfwDefault !== "exclude") {
      setFilters({ nsfw: nsfwDefault });
    }
  }, [nsfwDefault, searchParams, setFilters]);

  return { filters, setFilters };
}

export { NSFW_STORAGE_KEY, filtersToParams, parseFiltersFromParams };
