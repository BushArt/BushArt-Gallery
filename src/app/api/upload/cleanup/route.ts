import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { apiError, handleRouteError } from "@/lib/api/errors";
import { destroyAssets } from "@/lib/cloudinary/destroy";
import { error as logError } from "@/lib/logger";

/**
 * DELETE /api/upload/cleanup
 *
 * Destroys Cloudinary assets that were uploaded but never persisted to an
 * artwork, so a failed save does not leave paid storage permanently consumed
 * (05-API-Specification.md §6).
 *
 * This runs server-side because Cloudinary destroy requires the API secret.
 * An unsigned client-side destroy would require the secret in the browser.
 *
 * Auth: admin session required (requireAdmin). Non-admins cannot destroy assets.
 *
 * Safety: only ids inside the `bushart/` namespace are accepted. Without that
 * check, an admin session (or an attacker holding one) could delete arbitrary
 * assets belonging to other tenants sharing the Cloudinary cloud.
 *
 * Idempotency: Cloudinary reports "not found" for already-deleted assets and
 * destroyAssets treats that as success, so a retried cleanup is safe.
 */

const NAMESPACE = "bushart/";

/** Bound the batch so one request cannot fan out unbounded destroy calls. */
const MAX_ASSETS_PER_REQUEST = 25;

const cleanupSchema = z.object({
  assets: z
    .array(
      z.object({
        publicId: z.string().min(1).max(1024),
        resourceType: z.enum(["image", "video"]),
      }),
    )
    .min(1)
    .max(MAX_ASSETS_PER_REQUEST),
});

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
    }

    const parsed = cleanupSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Validation failed",
        { field: parsed.error.issues[0]?.path.join(".") ?? "" },
      );
    }

    const foreign = parsed.data.assets
      .filter(({ publicId }) => !publicId.startsWith(NAMESPACE))
      .map(({ publicId }) => publicId);

    if (foreign.length > 0) {
      return apiError(400, "VALIDATION_ERROR", "publicId must start with bushart/", {
        foreign,
      });
    }

    // Deduplicate so a repeated id costs one destroy call.
    const unique = new Map(
      parsed.data.assets.map((asset) => [
        `${asset.resourceType}:${asset.publicId}`,
        asset,
      ]),
    );

    try {
      await destroyAssets([...unique.values()]);
    } catch (error) {
      // The caller treats cleanup failure as advisory — the artwork save result
      // is unaffected — but it must be visible for reconciliation.
      logError("DELETE /api/upload/cleanup Cloudinary destroy failed", { error });
      return apiError(
        503,
        "SERVICE_UNAVAILABLE",
        "Uploaded assets could not be destroyed; reconciliation required",
      );
    }

    return NextResponse.json({ destroyed: unique.size });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/upload/cleanup");
  }
}