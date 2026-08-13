/**
 * Cloudinary cloud name, resolution-safe for both server and browser.
 *
 * Server builds read CLOUDINARY_CLOUD_NAME (the canonical variable per
 * 02-Technical-Specification.md §9). Next.js only inlines NEXT_PUBLIC_*
 * variables into browser bundles, so the browser-visible
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is consulted as a fallback. next.config.ts
 * also mirrors CLOUDINARY_CLOUD_NAME into NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 * when only the server var is set.
 */

export function resolveCloudName(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME
  );
}

/** Resolved at call time — do not cache at module scope for client bundles. */
export function getCloudName(): string | undefined {
  return resolveCloudName();
}
