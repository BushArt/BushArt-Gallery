import type { Artwork } from "@/types/artwork";
import type { Tag } from "@/types/tag";

/** Full artwork detail shape per 05-API-Specification.md §4.2 */
export function toArtworkDetailResponse(artwork: Artwork, tags: Tag[]) {
  return {
    id: artwork.id,
    slug: artwork.slug,
    title: artwork.title,
    description: artwork.description ?? null,
    medium: artwork.medium,
    type: artwork.type,
    nsfw: artwork.nsfw,
    completionDate: artwork.completionDate,
    images: [...artwork.images]
      .sort((a, b) => a.order - b.order)
      .map(({ publicId, url, width, height, order }) => ({
        publicId,
        url,
        width,
        height,
        order,
      })),
    timelapse: artwork.timelapse
      ? {
          publicId: artwork.timelapse.publicId,
          durationSeconds: artwork.timelapse.durationSeconds,
          width: artwork.timelapse.width,
          height: artwork.timelapse.height,
        }
      : null,
    tags: tags.map(({ id, name, slug }) => ({ id, name, slug })),
    featured: artwork.featured,
    featuredOrder: artwork.featuredOrder ?? null,
  };
}
