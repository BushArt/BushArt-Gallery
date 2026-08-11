import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guard";
import { signUploadSignature, FolderValidationError } from "@/lib/cloudinary/signature";

/**
 * POST /api/upload/signature
 *
 * Mints a short-lived, scoped signature authorizing the admin's browser
 * to upload directly to Cloudinary. The file bytes never pass through
 * this server.
 *
 * Auth: admin session required (requireAdmin).
 *
 * Spec: 05-API-Specification.md §6.1
 */

const requestSchema = z.object({
  resourceType: z.enum(["image", "video", "raw"]).default("image"),
  folder: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // 1. Enforce admin session independently (security boundary, not proxy.ts)
    await requireAdmin(request);

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid JSON body",
            details: {},
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message ?? "Invalid request",
            details: {},
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 3. Generate scoped signature
    const result = await signUploadSignature({
      resourceType: parsed.data.resourceType,
      folder: parsed.data.folder,
    });

    // 4. Return signature payload (API secret never included)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // requireAdmin throws Response for 401/423; rethrow those as-is
    if (error instanceof Response) {
      return error;
    }

    // Folder validation errors are client mistakes → 400, not 500
    if (error instanceof FolderValidationError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
            details: {},
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    console.error("Upload signature error:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate upload signature",
          details: {},
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}