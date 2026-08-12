import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { toPublicSettingsResponse } from "@/lib/api/settings-response";
import { apiError, handleRouteError } from "@/lib/api/errors";
import { findSettings, upsertSettings } from "@/lib/db/models/settings";
import { SiteSettingsPatchSchema } from "@/lib/validation/settings";

/**
 * GET /api/settings — public hero content (05 §4.5)
 * PATCH /api/settings — update homepage hero (05 §9.1)
 */

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await findSettings();
    return NextResponse.json(toPublicSettingsResponse(settings));
  } catch (error) {
    return handleRouteError(error, "GET /api/settings");
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
    }

    const parsed = SiteSettingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Validation failed",
        { field: parsed.error.issues[0]?.path.join(".") ?? "" },
      );
    }

    const updated = await upsertSettings(parsed.data);
    return NextResponse.json(toPublicSettingsResponse(updated));
  } catch (error) {
    return handleRouteError(error, "PATCH /api/settings");
  }
}
