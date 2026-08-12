/**
 * Cloudinary cloud name, resolution-safe for both server and browser.
 *
 * Server builds read CLOUDINARY_CLOUD_NAME (the canonical variable per
 * 02-Technical-Specification.md §9). Next.js only inlines NEXT_PUBLIC_*
 * variables into browser bundles, so the browser-visible
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is consulted as a fallback. Keeping this
 * in its own module lets transformations.ts build URLs on the client without
 * pulling in the server-only SDK client (which must stay server-only — it
 * reads the API secret).
 */

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export { cloudName };
