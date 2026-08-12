import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { toArtworkDetailResponse } from "@/lib/api/artwork-response";
import { apiError, handleRouteError, OBJECT_ID_REGEX } from "@/lib/api/errors";
import { destroyAssets, type DestroyAsset } from "@/lib/cloudinary/destroy";
import {
  deleteArtwork,
  findArtworkById,
  findArtworkBySlug,
  updateArtwork,
} from "@/lib/db/models/artwork";
import { findMissingTagIds, findTagsByIds } from "@/lib/db/models/tag";
import { ArtworkPatchRequestSchema } from "@/lib/validation/artwork";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/artworks/:slug — full detail (05 §4.2); param is slug, not ObjectId.
 * PATCH /api/artworks/:id — partial update (05 §7.2)
 * DELETE /api/artworks/:id — delete artwork + Cloudinary media (05 §7.3)
 */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id: slug } = await context.params;
    const artwork = await findArtworkBySlug(slug, true);

    if (!artwork) {
      return apiError(404, "NOT_FOUND", "Artwork not found");
    }

    const tags = await findTagsByIds(artwork.tagIds);
    return NextResponse.json(toArtworkDetailResponse(artwork, tags));
  } catch (error) {
    return handleRouteError(error, "GET /api/artworks/:slug");
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    const { id } = await context.params;
    if (!OBJECT_ID_REGEX.test(id)) {
      return apiError(400, "VALIDATION_ERROR", "id must be a 24-character hex string");
    }

    const existing = await findArtworkById(id);
    if (!existing) {
      return apiError(404, "NOT_FOUND", "Artwork not found");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
    }

    const parsed = ArtworkPatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Validation failed",
        { field: parsed.error.issues[0]?.path.join(".") ?? "" },
      );
    }

    if (parsed.data.tagIds !== undefined) {
      const missingTags = await findMissingTagIds(parsed.data.tagIds);
      if (missingTags.length > 0) {
        return apiError(400, "VALIDATION_ERROR", "One or more tagIds do not exist", {
          tagIds: missingTags,
        });
      }
    }

    const patch: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.completionDate !== undefined) {
      patch.completionDate = new Date(parsed.data.completionDate);
    }

    if (parsed.data.featured !== undefined || parsed.data.featuredOrder !== undefined) {
      const mergedFeatured = parsed.data.featured ?? existing.featured;
      let mergedFeaturedOrder =
        parsed.data.featuredOrder !== undefined
          ? parsed.data.featuredOrder
          : existing.featuredOrder;

      if (!mergedFeatured) {
        mergedFeaturedOrder = null;
      } else if (
        typeof mergedFeaturedOrder !== "number" ||
        Number.isNaN(mergedFeaturedOrder)
      ) {
        return apiError(
          400,
          "VALIDATION_ERROR",
          "featuredOrder is required when featured is true",
          { field: "featuredOrder" },
        );
      }

      patch.featured = mergedFeatured;
      patch.featuredOrder = mergedFeaturedOrder;
    }

    const artwork = await updateArtwork(id, patch);
    if (!artwork) {
      return apiError(404, "NOT_FOUND", "Artwork not found");
    }

    const tags = await findTagsByIds(artwork.tagIds);
    return NextResponse.json(toArtworkDetailResponse(artwork, tags));
  } catch (error) {
    return handleRouteError(error, "PATCH /api/artworks/:id");
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    const { id } = await context.params;
    if (!OBJECT_ID_REGEX.test(id)) {
      return apiError(400, "VALIDATION_ERROR", "id must be a 24-character hex string");
    }

    const existing = await findArtworkById(id);
    if (!existing) {
      return apiError(404, "NOT_FOUND", "Artwork not found");
    }

    const assets: DestroyAsset[] = existing.images.map((img) => ({
      publicId: img.publicId,
      resourceType: "image" as const,
    }));
    if (existing.timelapse) {
      assets.push({
        publicId: existing.timelapse.publicId,
        resourceType: "video",
      });
    }

    try {
      await destroyAssets(assets);
    } catch (error) {
      console.error("DELETE /api/artworks/:id Cloudinary destroy failed:", error);
      return apiError(
        503,
        "SERVICE_UNAVAILABLE",
        "Failed to delete artwork media; artwork was not removed",
      );
    }

    const deleted = await deleteArtwork(id);
    if (!deleted) {
      return apiError(404, "NOT_FOUND", "Artwork not found");
    }

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/artworks/:id");
  }
}
