import { findArtworkBySlug } from "@/lib/db/models/artwork";
import { slugifyOrDefault } from "@/lib/utils/slugify";

function randomSuffix(length = 4): string {
  let result = "";
  while (result.length < length) {
    result += Math.random().toString(36).slice(2);
  }
  return result.slice(0, length);
}

/**
 * Derive a unique artwork slug from a title, appending a short random suffix on collision.
 */
export async function generateUniqueArtworkSlug(title: string): Promise<string> {
  const base = slugifyOrDefault(title, "artwork");
  let slug = base;

  while (await findArtworkBySlug(slug, true)) {
    slug = `${base}-${randomSuffix()}`;
  }

  return slug;
}
