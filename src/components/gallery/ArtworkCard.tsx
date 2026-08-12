"use client";

import clsx from "clsx";
import Link from "next/link";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import { formatCompletionDate } from "@/lib/utils/formatDate";
import type { ArtworkListItem } from "@/types/artwork";
import { Badge } from "@/components/ui/Badge";
import { SketchRevealImage } from "@/components/ui/SketchReveal";

export type ViewMode = "grid" | "list";

interface ArtworkCardProps {
  artwork: ArtworkListItem;
  viewMode: ViewMode;
  description?: string | null;
}

export function ArtworkCard({ artwork, viewMode, description }: ArtworkCardProps) {
  const context = viewMode === "grid" ? "grid" : "list";
  const thumbUrl = getTransformationUrl(artwork.coverImage.publicId, context);
  const dateLabel = formatCompletionDate(artwork.completionDate);

  if (viewMode === "list") {
    return (
      <article className="group">
        <Link
          href={`/artwork/${artwork.slug}`}
          className="flex gap-4 rounded-md bg-ink-900 p-3 transition-colors hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass sm:gap-6"
          aria-label={`${artwork.title}, ${artwork.medium}, ${dateLabel}`}
        >
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md sm:h-28 sm:w-28 lg:h-32 lg:w-32">
            <SketchRevealImage src={thumbUrl} alt={artwork.title} />
            <div className="absolute right-1 top-1 flex flex-col gap-1">
              {artwork.nsfw && <Badge variant="nsfw" />}
              {artwork.type === "commission" && <Badge variant="commission" />}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-fraunces text-display-sm leading-display-sm text-paper-100">
              {artwork.title}
            </h3>
            <p className="mt-1 font-ibm-plex-mono text-label leading-label tracking-label text-paper-500">
              {artwork.medium} · {dateLabel}
            </p>
            {description && (
              <p className="mt-2 line-clamp-2 font-inter text-body-md leading-body-md text-paper-300">
                {description}
              </p>
            )}
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="group break-inside-avoid">
      <Link
        href={`/artwork/${artwork.slug}`}
        className="relative block overflow-hidden rounded-md bg-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
        aria-label={`${artwork.title}, ${artwork.medium}, ${dateLabel}`}
      >
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: `${artwork.coverImage.width} / ${artwork.coverImage.height}`,
          }}
        >
          <SketchRevealImage src={thumbUrl} alt={artwork.title} />
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            {artwork.nsfw && <Badge variant="nsfw" />}
            {artwork.type === "commission" && <Badge variant="commission" />}
          </div>
          <div
            className={clsx(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent px-3 pb-3 pt-8",
              "opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100",
            )}
          >
            <p className="truncate font-fraunces text-body-sm text-paper-100">{artwork.title}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}
