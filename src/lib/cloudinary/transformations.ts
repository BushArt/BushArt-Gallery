import { cloudName } from "./cloudName";

/**
 * Single source of truth for every derived-size Cloudinary URL.
 *
 * Each display context (grid/list/popup/fullscreen) maps to a fixed set of
 * transformation parameters (dimensions, crop strategy, `f_auto`, `q_auto`).
 * The download context serves the original at full resolution via `fl_attachment`.
 *
 * Adding a new gallery layout later only requires a new entry here — no
 * re-processing of existing uploads (12-Decision-Log.md ADR-008).
 */

export type TransformationContext = "grid" | "list" | "popup" | "fullscreen" | "download";

export type TransformationResourceType = "image" | "video";

/**
 * Central dimension + optimization presets per context.
 *
 * Display contexts apply `f_auto` (automatic format negotiation) and `q_auto`
 * (perceptually-tuned quality) per 02-Technical-Specification.md §7. The
 * download context deliberately omits them — originals are retained at full
 * resolution and delivered via `fl_attachment` (§7).
 */
const PRESETS: Record<TransformationContext, string> = {
  grid: "w_400,h_400,c_fill,f_auto,q_auto",
  list: "w_600,h_600,c_fill,f_auto,q_auto",
  popup: "w_1200,h_1200,c_fill,f_auto,q_auto",
  fullscreen: "w_1600,h_1600,c_fill,f_auto,q_auto",
  download: "fl_attachment",
};

/**
 * Build the full Cloudinary delivery URL for a given public id and context.
 *
 * @param publicId    The Cloudinary public id of the asset.
 * @param context     Which derived size to produce.
 * @param resourceType The asset's resource type. Defaults to "image"; pass
 *                     "video" for timelapse assets (05-API-Specification.md §4.3).
 * @returns The complete Cloudinary URL with the context's transformation applied.
 */
export function getTransformationUrl(
  publicId: string,
  context: TransformationContext,
  resourceType: TransformationResourceType = "image",
): string {
  const name =
    process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? cloudName;

  if (!name) {
    throw new Error(
      "Missing Cloudinary cloud name. Set CLOUDINARY_CLOUD_NAME (server) or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (client).",
    );
  }

  const transformation = PRESETS[context];
  return `https://res.cloudinary.com/${name}/${resourceType}/upload/${transformation}/${publicId}`;
}

/**
 * Return the transformation parameter string for a context, without the URL.
 * Useful for tests and for callers that assemble URLs themselves.
 */
export function getTransformationParams(context: TransformationContext): string {
  return PRESETS[context];
}
