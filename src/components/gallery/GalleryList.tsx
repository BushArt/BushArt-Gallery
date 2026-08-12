import type { ArtworkListItem } from "@/types/artwork";
import { ArtworkCard } from "./ArtworkCard";

interface GalleryListProps {
  items: ArtworkListItem[];
}

export function GalleryList({ items }: GalleryListProps) {
  return (
    <ul className="flex flex-col gap-3" data-testid="gallery-list">
      {items.map((artwork) => (
        <li key={artwork.id}>
          <ArtworkCard artwork={artwork} viewMode="list" />
        </li>
      ))}
    </ul>
  );
}
