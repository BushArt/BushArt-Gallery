"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  return data;
}

export function useArtwork({
  slug,
  initialData = null,
  enabled = true,
}: UseArtworkOptions): UseArtworkResult {
  const [trackedSlug, setTrackedSlug] = useState(slug);
  const [artwork, setArtwork] = useState<ArtworkDetailResponse | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (slug !== trackedSlug) {
    setTrackedSlug(slug);
    setArtwork(initialData);
    setError(null);
    setIsLoading(!initialData && enabled);
  }

  useEffect(() => {
    if (!enabled || initialData) return;

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
