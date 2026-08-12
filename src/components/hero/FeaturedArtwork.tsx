import Link from "next/link";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import type { ArtworkListItem } from "@/types/artwork";

interface FeaturedArtworkProps {
  artworks: ArtworkListItem[];
}

export function FeaturedArtwork({ artworks }: FeaturedArtworkProps) {
  return (
    <section className="mt-12" aria-label="Featured artwork">
      <h2 className="mb-4 font-fraunces text-display-sm leading-display-sm text-paper-100">
        Featured
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {artworks.map((artwork) => {
          const thumbUrl = getTransformationUrl(artwork.coverImage.publicId, "grid");
          return (
            <li key={artwork.id}>
              <Link
                href={`/artwork/${artwork.slug}`}
                className="group block overflow-hidden rounded-md bg-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl}
                  alt={artwork.title}
                  className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
                <p className="truncate px-2 py-2 font-fraunces text-body-sm text-paper-100">
                  {artwork.title}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
