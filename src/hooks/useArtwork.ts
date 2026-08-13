"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedArtworkDetail, cacheArtworkDetail } from "@/lib/utils/artworkDetailCache";
import type { ArtworkDetailResponse } from "@/types/api";

interface UseArtworkOptions {
  slug: string;
  initialData?: ArtworkDetailResponse | null;
  enabled?: boolean;
}

interface UseArtworkResult {
  artwork: ArtworkDetailResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

async function loadArtwork(
  slug: string,
  signal: AbortSignal,
): Promise<ArtworkDetailResponse> {
  const res = await fetch(`/api/artworks/${encodeURIComponent(slug)}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  const data = (await res.json()) as ArtworkDetailResponse;
  if (data.slug !== slug) {
    throw new DOMException("Stale artwork response", "AbortError");
  }
  cacheArtworkDetail(data);
  return data;
}

function resolveInitialData(
  slug: string,
  initialData: ArtworkDetailResponse | null,
): ArtworkDetailResponse | null {
  if (initialData) return initialData;
  const cached = getCachedArtworkDetail(slug);
  return cached?.slug === slug ? cached : null;
}

export function useArtwork({
  slug,
  initialData = null,
  enabled = true,
}: UseArtworkOptions): UseArtworkResult {
  const seeded = resolveInitialData(slug, initialData);
  const [trackedSlug, setTrackedSlug] = useState(slug);
  const [artwork, setArtwork] = useState<ArtworkDetailResponse | null>(seeded);
  const [isLoading, setIsLoading] = useState(!seeded && enabled);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (slug !== trackedSlug) {
    const nextSeeded = resolveInitialData(slug, initialData);
    setTrackedSlug(slug);
    setArtwork(nextSeeded);
    setError(null);
    setIsLoading(!nextSeeded && enabled);
  }

  useEffect(() => {
    const resolved = resolveInitialData(slug, initialData);
    if (!enabled || resolved) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestedSlug = slug;

    let cancelled = false;

    loadArtwork(requestedSlug, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setArtwork(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load artwork");
        setArtwork(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, initialData, slug]);

  const refresh = useCallback(() => {
    if (!enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestedSlug = slug;

    setIsLoading(true);
    setError(null);

    loadArtwork(requestedSlug, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setArtwork(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load artwork");
        setArtwork(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
  }, [enabled, slug]);

  return {
    artwork,
    isLoading,
    error,
    refresh,
  };
}
