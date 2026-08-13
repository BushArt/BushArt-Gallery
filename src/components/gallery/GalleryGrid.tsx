"use client";

import type { ArtworkListItem } from "@/types/artwork";
import { ArtworkCard } from "./ArtworkCard";

interface GalleryGridProps {
  items: ArtworkListItem[];
}

export function GalleryGrid({ items }: GalleryGridProps) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      style={{ gridAutoFlow: "dense" }}
      data-testid="gallery-grid"
    >
      {items.map((artwork) => (
        <ArtworkCard key={artwork.id} artwork={artwork} viewMode="grid" />
      ))}
    </div>
  );
}
