import type { Artwork } from "@/types/artwork";
import type { Tag } from "@/types/tag";

/** Full artwork detail shape per 05-API-Specification.md §4.2 */
export function toArtworkDetailResponse(artwork: Artwork, tags: Tag[]) {
  return {
    id: artwork.id,
    slug: artwork.slug,
    title: artwork.title,
    description: artwork.description,
    medium: artwork.medium,
    type: artwork.type,
    nsfw: artwork.nsfw,
    completionDate: artwork.completionDate,
    images: artwork.images.map(({ publicId, width, height, order }) => ({
      publicId,
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
  };
}
