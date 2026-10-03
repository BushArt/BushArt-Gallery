import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { toArtworkDetailResponse } from "@/lib/api/artwork-response";
import {
  generateUniqueArtworkSlug,
  SlugGenerationError,
} from "@/lib/api/artwork-slug";
import { apiError, handleRouteError } from "@/lib/api/errors";
import { createArtwork, listArtworks } from "@/lib/db/models/artwork";
import { findMissingTagIds, findTagsByIds } from "@/lib/db/models/tag";
import {
  describeAssetRejections,
  verifyAssetOwnershipAll,
  type AssetRef,
} from "@/lib/cloudinary/verify";
import { error as logError } from "@/lib/logger";
import {
  ArtworkCreateRequestSchema,
  ArtworkListQuerySchema,
  type ArtworkCreateRequest,
} from "@/lib/validation/artwork";

/**
 * GET /api/artworks — paginated gallery feed (05 §4.1)
 * POST /api/artworks — create artwork (05 §7.1)
 */

/**
 * Upper bound on duplicate-slug retries.
 *
 * The read probe in generateUniqueArtworkSlug is best-effort; the
 * `artworks_slug_unique` index is authoritative. Two concurrent creates can
 * both pass the probe and race to insert, so the loser gets 11000 here and
 * retries with a fresh random suffix. Three attempts is ample for a 4-hex-char
 * suffix and keeps the failure mode bounded rather than looping on a hot slug.
 */
const MAX_SLUG_INSERT_ATTEMPTS = 3;

/** MongoDB duplicate-key error code. */
const DUPLICATE_KEY = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === DUPLICATE_KEY
  );
}

/** Collect every Cloudinary asset referenced by an artwork write, for verification. */
function collectAssetRefs(data: ArtworkCreateRequest): AssetRef[] {
  const refs: AssetRef[] = data.images.map((image: { publicId: string }) => ({
    publicId: image.publicId,
    resourceType: "image" as const,
  }));
  if (data.timelapse) {
    refs.push({ publicId: data.timelapse.publicId, resourceType: "video" });
  }
  return refs;
}

/**
 * Verify that every referenced Cloudinary asset exists and belongs to this app.
 *
 * A rejected asset is a client error: the admin supplied a publicId that was
 * never uploaded here, or that lives outside the `bushart/` namespace. Surfaces
 * which ids failed so the admin can correct the request.
 */
async function verifyReferencedAssets(data: ArtworkCreateRequest): Promise<NextResponse | null> {
  const result = await verifyAssetOwnershipAll(collectAssetRefs(data));

  if (result.ok) return null;

  const { missing, foreign } = describeAssetRejections(result.rejected);
  return apiError(
    400,
    "VALIDATION_ERROR",
    "One or more referenced Cloudinary assets could not be verified",
    { missing, foreign },
  );
}

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
  // Parsed payload is hoisted out of the try so the duplicate-slug retry below
  // can rebuild the insert without re-parsing (and re-verifying) the body.
  let data: ArtworkCreateRequest | null = null;

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

    data = parsed.data;

    const missingTags = await findMissingTagIds(data.tagIds);
    if (missingTags.length > 0) {
      return apiError(400, "VALIDATION_ERROR", "One or more tagIds do not exist", {
        tagIds: missingTags,
      });
    }

    // Prove the referenced media really exists before persisting a document that
    // points at it. Done once — the assets don't change across slug retries.
    const assetError = await verifyReferencedAssets(data);
    if (assetError) return assetError;

    for (let attempt = 1; ; attempt++) {
      const slug = await generateUniqueArtworkSlug(data.title);

      try {
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
        // Another create claimed this slug between the probe and the insert.
        // Retry with a fresh suffix rather than surfacing a 500 to the admin.
        if (!isDuplicateKeyError(error) || attempt >= MAX_SLUG_INSERT_ATTEMPTS) {
          throw error;
        }
        logError("POST /api/artworks slug collision; retrying", {
          attempt,
          slug,
        });
      }
    }
  } catch (error) {
    if (error instanceof SlugGenerationError) {
      return apiError(500, "INTERNAL_ERROR", "Could not derive a unique slug; please retry");
    }
    return handleRouteError(error, "POST /api/artworks");
  }
}