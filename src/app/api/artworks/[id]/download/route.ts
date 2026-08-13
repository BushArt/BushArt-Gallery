import { NextRequest, NextResponse } from "next/server";
import { apiError, handleRouteError } from "@/lib/api/errors";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import { findArtworkBySlug } from "@/lib/db/models/artwork";
import { ArtworkDownloadQuerySchema } from "@/lib/validation/artwork";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/artworks/:slug/download — redirect to Cloudinary fl_attachment URL (05 §4.3)
 */

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: slug } = await context.params;
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = ArtworkDownloadQuerySchema.safeParse(raw);

    if (!parsed.success) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid query parameters",
      );
    }

    const artwork = await findArtworkBySlug(slug, true);
    if (!artwork) {
      return apiError(404, "NOT_FOUND", "Artwork not found");
    }

    const { image: imageIndex, asset } = parsed.data;

    if (asset === "timelapse") {
      if (!artwork.timelapse) {
        return apiError(404, "NOT_FOUND", "Timelapse not found");
      }
      const url = getTransformationUrl(
        artwork.timelapse.publicId,
        "download",
        "video",
      );
      return NextResponse.redirect(url, 302);
    }

    const sortedImages = [...artwork.images].sort((a, b) => a.order - b.order);
    const image = sortedImages[imageIndex];
    if (!image) {
      return apiError(404, "NOT_FOUND", "Image not found");
    }

    const url = getTransformationUrl(image.publicId, "download", "image");
    return NextResponse.redirect(url, 302);
  } catch (error) {
    return handleRouteError(error, "GET /api/artworks/:slug/download");
  }
}
