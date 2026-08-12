import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { apiError, handleRouteError, OBJECT_ID_REGEX } from "@/lib/api/errors";
import { deleteTag } from "@/lib/db/models/tag";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/tags/:id — cascading delete (05 §8.2)
 */

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

    const deleted = await deleteTag(id);
    if (!deleted) {
      return apiError(404, "NOT_FOUND", "Tag not found");
    }

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/tags/:id");
  }
}
