"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { filtersToSearchParams } from "@/lib/utils/filterParams";
import {
  dispatchNsfwPreferenceChanged,
  NSFW_PREFERENCE_CHANGED,
} from "@/lib/utils/nsfwEvents";
import { parseYearParam } from "@/lib/utils/parseYear";

const NSFW_STORAGE_KEY = "bushart-nsfw";

export interface FilterState {
  tags: string[];
  year: number | null;
  medium: string;
  type: "" | "personal" | "commission";
  nsfw: "include" | "exclude";
  sort: "recent" | "oldest";
}

function readNsfwFromStorage(): "include" | "exclude" {
  if (typeof window === "undefined") return "exclude";
  const stored = localStorage.getItem(NSFW_STORAGE_KEY);
  return stored === "include" ? "include" : "exclude";
}

function subscribeNsfwPreference(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === NSFW_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(NSFW_PREFERENCE_CHANGED, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(NSFW_PREFERENCE_CHANGED, onStoreChange);
  };
}

function parseFiltersFromParams(searchParams: URLSearchParams, nsfwDefault: "include" | "exclude"): FilterState {
  const tagsRaw = searchParams.get("tags");
  const typeRaw = searchParams.get("type");
  const nsfwRaw = searchParams.get("nsfw");
  const sortRaw = searchParams.get("sort");

  return {
    tags: tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
    year: parseYearParam(searchParams.get("year")),
    medium: searchParams.get("medium") ?? "",
    type: typeRaw === "personal" || typeRaw === "commission" ? typeRaw : "",
    nsfw: nsfwRaw === "include" || nsfwRaw === "exclude" ? nsfwRaw : nsfwDefault,
    sort: sortRaw === "oldest" ? "oldest" : "recent",
  };
}

function filtersToParams(filters: FilterState): URLSearchParams {
  return filtersToSearchParams(filters);
}

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nsfwDefault = useSyncExternalStore(
    subscribeNsfwPreference,
    readNsfwFromStorage,
    () => "exclude" as const,
  );

  const filters = useMemo(
    () => parseFiltersFromParams(searchParams, nsfwDefault),
    [searchParams, nsfwDefault],
  );

  const setFilters = useCallback(
    (next: Partial<FilterState>) => {
      const merged = { ...filters, ...next };
      if (next.nsfw !== undefined) {
        localStorage.setItem(NSFW_STORAGE_KEY, merged.nsfw);
        dispatchNsfwPreferenceChanged(merged.nsfw);
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
