import type { ArtworkListItem } from "@/types/artwork";
import { ArtworkCard } from "./ArtworkCard";

interface GalleryListProps {
  items: ArtworkListItem[];
  leadingSlot?: React.ReactNode;
}

export function GalleryList({ items, leadingSlot }: GalleryListProps) {
  return (
    <ul className="flex flex-col gap-3" data-testid="gallery-list">
      {leadingSlot && <li className="list-none">{leadingSlot}</li>}
      {items.map((artwork) => (
        <li key={artwork.id}>
          <ArtworkCard
            artwork={artwork}
            viewMode="list"
            description={artwork.descriptionPreview}
          />
        </li>
      ))}
    </ul>
  );
}
