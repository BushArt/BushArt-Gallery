import type { ArtworkListItem, ArtworkPreview } from "@/types/artwork";

/**
 * Hover/focus preview payloads, keyed by slug.
 *
 * Bounded so a long browsing session cannot grow the map without limit.
 * Insertion order is the eviction order: re-inserting an existing key refreshes
 * recency by delete-then-set.
 */
const MAX_ENTRIES = 100;

const artworkPreviewCache = new Map<string, ArtworkPreview>();

export function cacheArtworkPreview(preview: ArtworkPreview): void {
  artworkPreviewCache.delete(preview.slug);
  artworkPreviewCache.set(preview.slug, preview);

  if (artworkPreviewCache.size > MAX_ENTRIES) {
    const oldest = artworkPreviewCache.keys().next();
    if (!oldest.done) {
      artworkPreviewCache.delete(oldest.value);
    }
  }
}

export function getCachedArtworkPreview(slug: string): ArtworkPreview | null {
  return artworkPreviewCache.get(slug) ?? null;
}

export function clearArtworkPreviewCache(): void {
  artworkPreviewCache.clear();
}