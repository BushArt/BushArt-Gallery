"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import { cacheArtworkDetail } from "@/lib/utils/artworkDetailCache";
import type { ArtworkListItem } from "@/types/artwork";
import { SketchRevealImage } from "@/components/ui/SketchReveal";

function FeaturedArtworkCard({ artwork }: { artwork: ArtworkListItem }) {
  const router = useRouter();
  const thumbUrl = getTransformationUrl(artwork.coverImage.publicId, "grid");
  const href = `/artwork/${artwork.slug}`;

  const prefetchDetail = useCallback(() => {
    router.prefetch(href);
    void fetch(`/api/artworks/${encodeURIComponent(artwork.slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) cacheArtworkDetail(data);
      })
      .catch(() => {});
  }, [artwork.slug, href, router]);

  return (
    <Link
      href={href}
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
      className="group block overflow-hidden rounded-md bg-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
    >
      <SketchRevealImage
        src={thumbUrl}
        alt={artwork.title}
        className="aspect-square w-full [&_img]:aspect-square [&_img]:w-full [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-200 [&_img]:group-hover:scale-[1.02]"
      />
      <p className="truncate px-2 py-2 font-fraunces text-body-sm text-paper-100">
        {artwork.title}
      </p>
    </Link>
  );
}

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
        {artworks.map((artwork) => (
          <li key={artwork.id}>
            <FeaturedArtworkCard artwork={artwork} />
          </li>
        ))}
      </ul>
    </section>
  );
}
