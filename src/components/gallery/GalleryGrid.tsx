import type { ArtworkListItem } from "@/types/artwork";
import { ArtworkCard } from "./ArtworkCard";

interface GalleryGridProps {
  items: ArtworkListItem[];
}

export function GalleryGrid({ items }: GalleryGridProps) {
  return (
    <div
      className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
      data-testid="gallery-grid"
    >
      {items.map((artwork) => (
        <div key={artwork.id} className="mb-4">
          <ArtworkCard artwork={artwork} viewMode="grid" />
        </div>
      ))}
    </div>
  );
}
