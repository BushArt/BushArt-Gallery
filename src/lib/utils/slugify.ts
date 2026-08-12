/**
 * Convert arbitrary text to a URL-safe slug: lowercase, hyphen-separated alphanumerics.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Slug pattern enforced by validation schemas and MongoDB slug fields. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Normalize slugify output to a valid slug, falling back when the input yields nothing usable.
 */
export function slugifyOrDefault(text: string, fallback = "item"): string {
  const slug = slugify(text);
  return SLUG_PATTERN.test(slug) ? slug : fallback;
}
