import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { apiError, handleRouteError } from "@/lib/api/errors";
import {
  createTag,
  findTagByNameInsensitive,
  findTagBySlug,
  listTags,
} from "@/lib/db/models/tag";
import { TagCreateRequestSchema } from "@/lib/validation/tag";
import { slugifyOrDefault } from "@/lib/utils/slugify";

/**
 * GET /api/tags — master tag list (05 §4.4)
 * POST /api/tags — create tag (05 §8.1)
 */

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const items = await listTags();
    return NextResponse.json({ items });
  } catch (error) {
    return handleRouteError(error, "GET /api/tags");
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

    const parsed = TagCreateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Validation failed",
      );
    }

    const existing = await findTagByNameInsensitive(parsed.data.name);
    if (existing) {
      return apiError(409, "CONFLICT", "A tag with this name already exists");
    }

    const slug = slugifyOrDefault(parsed.data.name, "tag");
    const slugTaken = await findTagBySlug(slug);
    if (slugTaken) {
      return apiError(409, "CONFLICT", "A tag with this name already exists");
    }

    try {
      const tag = await createTag({ name: parsed.data.name, slug });
      return NextResponse.json(tag, { status: 201 });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return apiError(409, "CONFLICT", "A tag with this name already exists");
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/tags");
  }
}
