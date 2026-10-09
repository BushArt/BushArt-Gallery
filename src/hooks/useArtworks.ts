"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArtworkListItem } from "@/types/artwork";
import type { ArtworkListResponse } from "@/types/api";
import type { FilterState } from "@/hooks/useFilters";
import { filtersToSearchParams } from "@/lib/utils/filterParams";

interface UseArtworksOptions {
  filters: FilterState;
  enabled?: boolean;
}

interface UseArtworksResult {
  items: ArtworkListItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  isRetryable: boolean;
  hasMore: boolean;
  appendFailed: boolean;
  loadMore: () => void;
  refresh: () => void;
  retryLoadMore: () => void;
}

function buildQueryString(filters: FilterState, cursor?: string): string {
  return filtersToSearchParams(filters, cursor).toString();
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 0;
}

export function useArtworks({ filters, enabled = true }: UseArtworksOptions): UseArtworksResult {
  const [items, setItems] = useState<ArtworkListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [appendFailed, setAppendFailed] = useState(false);
  const lastAppendCursorRef = useRef<string | null>(null);
  const filtersKey = JSON.stringify(filters);
  const abortRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);
  const filtersRef = useRef(filters);
  // Sync outside render (react-hooks/refs); declared before the fetch effect
  // below so a filters change is always read after this has run.
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchPage = useCallback(
    async (nextCursor?: string, append = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentFetchId = ++fetchIdRef.current;
      const currentFilters = filtersRef.current;

      if (append) {
        setIsLoadingMore(true);
        setAppendFailed(false);
        lastAppendCursorRef.current = nextCursor ?? null;
      } else {
        setCursor(null);
        setHasMore(false);
        setIsLoading(true);
        setError(null);
        setIsRetryable(false);
        setAppendFailed(false);
        lastAppendCursorRef.current = null;
      }

      try {
        const qs = buildQueryString(currentFilters, nextCursor);
        const res = await fetch(`/api/artworks?${qs}`, { signal: controller.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message = body?.error?.message ?? `Request failed (${res.status})`;
          setIsRetryable(isRetryableStatus(res.status));
          if (append) setAppendFailed(true);
          throw new Error(message);
        }
        const data = (await res.json()) as ArtworkListResponse;

        if (fetchIdRef.current !== currentFetchId) return;

        setItems((prev) => {
          if (!append) return data.items;
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = data.items.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setIsRetryable(false);
        setAppendFailed(false);
      } catch (err) {
        if (fetchIdRef.current !== currentFetchId) return;
        const isAbortError =
          err instanceof DOMException && err.name === "AbortError" ||
          err instanceof Error && err.name === "AbortError";
        if (isAbortError) return;
        if (err instanceof TypeError) {
          setIsRetryable(true);
        }
        setError(err instanceof Error ? err.message : "Failed to load artworks");
        if (!append) setItems([]);
      } finally {
        if (fetchIdRef.current === currentFetchId) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-deps pattern
    void fetchPage();
    return () => abortRef.current?.abort();
  }, [enabled, filtersKey, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading || !cursor) return;
    void fetchPage(cursor, true);
  }, [cursor, fetchPage, hasMore, isLoading, isLoadingMore]);

  const refresh = useCallback(() => {
    void fetchPage();
  }, [fetchPage]);

  const retryLoadMore = useCallback(() => {
    const retryCursor = lastAppendCursorRef.current ?? cursor;
    if (!retryCursor) {
      refresh();
      return;
    }
    setError(null);
    void fetchPage(retryCursor, true);
  }, [cursor, fetchPage, refresh]);

  return {
    items,
    isLoading,
    isLoadingMore,
    error,
    isRetryable,
    hasMore,
    appendFailed,
    loadMore,
    refresh,
    retryLoadMore,
  };
}

/** Exported for tests — builds the query string FilterBar must produce. */
export { buildQueryString };
