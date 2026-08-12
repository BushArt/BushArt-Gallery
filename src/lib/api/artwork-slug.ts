import { findArtworkBySlug } from "@/lib/db/models/artwork";
import { slugifyOrDefault } from "@/lib/utils/slugify";

/**
 * Derive a unique artwork slug from a title, appending numeric suffixes on collision.
 */
export async function generateUniqueArtworkSlug(title: string): Promise<string> {
  const base = slugifyOrDefault(title, "artwork");
  let slug = base;
  let suffix = 1;

  while (await findArtworkBySlug(slug, true)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
