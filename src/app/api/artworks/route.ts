import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { toArtworkDetailResponse } from "@/lib/api/artwork-response";
import { generateUniqueArtworkSlug } from "@/lib/api/artwork-slug";
import { apiError, handleRouteError } from "@/lib/api/errors";
import { createArtwork, listArtworks } from "@/lib/db/models/artwork";
import { findMissingTagIds, findTagsByIds } from "@/lib/db/models/tag";
import {
  ArtworkCreateRequestSchema,
  ArtworkListQuerySchema,
} from "@/lib/validation/artwork";

/**
 * GET /api/artworks — paginated gallery feed (05 §4.1)
 * POST /api/artworks — create artwork (05 §7.1)
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = ArtworkListQuerySchema.safeParse(raw);

    if (!parsed.success) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid query parameters",
      );
    }

    const { tags, year, medium, type, nsfw, sort, cursor, limit } = parsed.data;

    let result;
    try {
      result = await listArtworks({
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        year,
        medium,
        type,
        nsfw,
        sort,
        cursor,
        limit,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid cursor") {
        return apiError(400, "VALIDATION_ERROR", "Invalid cursor");
      }
      throw err;
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "GET /api/artworks");
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
    }

    const parsed = ArtworkCreateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Validation failed",
        { field: parsed.error.issues[0]?.path.join(".") ?? "" },
      );
    }

    const data = parsed.data;
    const missingTags = await findMissingTagIds(data.tagIds);
    if (missingTags.length > 0) {
      return apiError(400, "VALIDATION_ERROR", "One or more tagIds do not exist", {
        tagIds: missingTags,
      });
    }

    const slug = await generateUniqueArtworkSlug(data.title);

    const artwork = await createArtwork({
      slug,
      title: data.title,
      description: data.description ?? null,
      medium: data.medium,
      type: data.type,
      nsfw: data.nsfw,
      featured: data.featured ?? false,
      featuredOrder: data.featuredOrder ?? null,
      images: data.images,
      timelapse: data.timelapse ?? null,
      tagIds: data.tagIds,
      completionDate: new Date(data.completionDate),
    });

    const tags = await findTagsByIds(artwork.tagIds);
    return NextResponse.json(toArtworkDetailResponse(artwork, tags), { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/artworks");
  }
}
