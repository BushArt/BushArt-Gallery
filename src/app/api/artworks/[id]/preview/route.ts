import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/guard";
import { apiError, handleRouteError } from "@/lib/api/errors";
import { findArtworkPreview } from "@/lib/db/models/artwork";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/artworks/:slug/preview — lightweight hover payload.
 *
 * The gallery prefetches on hover/focus so the popup can open without a
 * spinner. Fetching the full detail document for that warmed up every
 * hover with fields the preview never reads (all images beyond the cover, the
 * timelapse, tag ids). This endpoint returns only what a preview needs.
 *
 * `Cache-Control: private, no-store` — the response varies by admin session
 * (NSFW visibility), so it must not be cached by a shared intermediary.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: slug } = await context.params;

    // 503 (booting) and 423 (locked) propagate instead of silently degrading
    // to the public view — see isAdminRequest.
    const isAdmin = await isAdminRequest(request);

    const preview = await findArtworkPreview(slug, isAdmin);

    if (!preview) {
      return apiError(404, "NOT_FOUND", "Artwork not found");
    }

    return NextResponse.json(preview, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/artworks/:slug/preview");
  }
}