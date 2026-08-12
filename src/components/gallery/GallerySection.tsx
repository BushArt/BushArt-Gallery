"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useArtworks } from "@/hooks/useArtworks";
import { useFilters } from "@/hooks/useFilters";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { TagListResponse } from "@/types/api";
import type { ViewMode } from "./ArtworkCard";
import { FilterBar, NsfwToggle } from "./FilterBar";
import { GalleryGrid } from "./GalleryGrid";
import { GalleryList } from "./GalleryList";
import { ViewModeToggle } from "./ViewModeToggle";

const VIEW_MODE_KEY = "bushart-view-mode";

function readViewMode(): ViewMode {
  if (typeof window === "undefined") return "grid";
  return sessionStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid";
}

function GallerySectionInner() {
  const { filters, setFilters } = useFilters();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => readViewMode());
  const [tags, setTags] = useState<TagListResponse>([]);
  const { items, isLoading, isLoadingMore, error, isRetryable, hasMore, loadMore, refresh } =
    useArtworks({
      filters,
    });

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore,
  });

  useEffect(() => {
    void fetch("/api/tags")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TagListResponse) => setTags(data))
      .catch(() => setTags([]));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    const scrollY = window.scrollY;
    sessionStorage.setItem(VIEW_MODE_KEY, mode);
    setViewModeState(mode);
    requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
  }, []);

  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-24 pt-8" aria-label="Gallery">
      <div className="sticky top-0 z-20 -mx-4 bg-ink-950/95 px-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <NsfwToggle
            nsfw={filters.nsfw}
            onChange={(nsfw) => setFilters({ nsfw })}
          />
        </div>
        <FilterBar
          filters={filters}
          tags={tags}
          onFiltersChange={setFilters}
        />
      </div>

      {error && (
        <div className="mt-8 text-center" role="alert">
          <p className="text-body-md text-accent-ember">{error}</p>
          {isRetryable && (
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-3 rounded-md bg-ink-800 px-4 py-2 text-body-sm text-paper-100 transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {isLoading && !error && (
        <p className="mt-8 text-center text-body-md text-paper-500">Loading gallery…</p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p className="mt-8 text-center text-body-md text-paper-500">No artworks match these filters.</p>
      )}

      {!isLoading && items.length > 0 && (
        <div className="mt-6">
          {viewMode === "grid" ? (
            <GalleryGrid items={items} />
          ) : (
            <GalleryList items={items} />
          )}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" aria-hidden="true" />

      {isLoadingMore && (
        <p className="mt-4 text-center text-body-sm text-paper-500">Loading more…</p>
      )}
    </section>
  );
}

export function GallerySection() {
  return (
    <Suspense fallback={<p className="py-12 text-center text-paper-500">Loading gallery…</p>}>
      <GallerySectionInner />
    </Suspense>
  );
}
