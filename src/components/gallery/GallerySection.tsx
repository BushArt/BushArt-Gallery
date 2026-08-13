"use client";

import { Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useState, useSyncExternalStore, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAdminShell } from "@/components/admin/AdminShell";
import { useArtworks } from "@/hooks/useArtworks";
import { useFilters } from "@/hooks/useFilters";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { TagListResponse } from "@/types/api";
import type { Tag } from "@/types/tag";
import type { ViewMode } from "./ArtworkCard";
import { FilterBar, NsfwToggle } from "./FilterBar";
import { GalleryGrid } from "./GalleryGrid";
import { GalleryList } from "./GalleryList";
import { UploadCard } from "./UploadCard";
import { ViewModeToggle } from "./ViewModeToggle";

const VIEW_MODE_KEY = "bushart-view-mode";
const VIEW_MODE_CHANGED = "bushart-view-mode-changed";

function readViewMode(): ViewMode {
  if (typeof window === "undefined") return "grid";
  return sessionStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid";
}

function subscribeViewMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(VIEW_MODE_CHANGED, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(VIEW_MODE_CHANGED, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function GallerySectionInner({ refreshRef }: { refreshRef?: RefObject<(() => void) | null> }) {
  const { openUpload } = useAdminShell();
  const { filters, setFilters } = useFilters();
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const prefersReducedMotion = useReducedMotion();
  const viewMode = useSyncExternalStore(subscribeViewMode, readViewMode, (): ViewMode => "grid");
  const [tags, setTags] = useState<Tag[]>([]);
  const {
    items,
    isLoading,
    isLoadingMore,
    error,
    isRetryable,
    hasMore,
    loadMore,
    refresh,
    retryLoadMore,
    appendFailed,
  } = useArtworks({
    filters,
  });

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore,
  });

  useEffect(() => {
    void fetch("/api/tags")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: TagListResponse) => setTags(data.items))
      .catch(() => setTags([]));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    const scrollY = window.scrollY;
    sessionStorage.setItem(VIEW_MODE_KEY, mode);
    window.dispatchEvent(new Event(VIEW_MODE_CHANGED));
    requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
  }, []);

  const handleRetry = useCallback(() => {
    if (appendFailed) {
      retryLoadMore();
    } else {
      refresh();
    }
  }, [appendFailed, refresh, retryLoadMore]);

  useImperativeHandle(refreshRef, () => refresh, [refresh]);

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

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div className="mt-8 text-center" role="alert">
            <p className="text-body-md text-accent-ember">{error}</p>
            {isRetryable && (
              <button
                type="button"
                onClick={handleRetry}
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
          <p className="mt-8 text-center text-body-md text-paper-500">
            No artworks match these filters.
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isLoading && !error && (items.length > 0 || viewMode === "grid") && (
          <motion.div
            key={filtersKey}
            className="mt-6"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {viewMode === "grid" ? (
              <GalleryGrid items={items} leadingSlot={<UploadCard onClick={openUpload} />} />
            ) : (
              <GalleryList items={items} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={sentinelRef} className="h-4" aria-hidden="true" />

      {isLoadingMore && (
        <p className="mt-4 text-center text-body-sm text-paper-500" aria-live="polite">
          Loading more…
        </p>
      )}
    </section>
  );
}

export function GallerySection({
  refreshRef,
}: {
  refreshRef?: RefObject<(() => void) | null>;
}) {
  return (
    <Suspense fallback={<p className="py-12 text-center text-paper-500">Loading gallery…</p>}>
      <GallerySectionInner refreshRef={refreshRef} />
    </Suspense>
  );
}
