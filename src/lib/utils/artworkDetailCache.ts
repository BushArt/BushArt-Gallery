import type { ArtworkDetailResponse } from "@/types/api";

const artworkDetailCache = new Map<string, ArtworkDetailResponse>();

export function cacheArtworkDetail(detail: ArtworkDetailResponse): void {
  artworkDetailCache.set(detail.slug, detail);
}

export function getCachedArtworkDetail(slug: string): ArtworkDetailResponse | null {
  return artworkDetailCache.get(slug) ?? null;
}

export function clearArtworkDetailCache(): void {
  artworkDetailCache.clear();
}
