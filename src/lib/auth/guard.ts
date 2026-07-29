import { NextRequest } from "next/server";
import { AdminProfileSchema } from "@/lib/validation/auth";

/**
 * Server-side auth guard for admin Route Handlers.
 *
 * Independently re-verifies the session from the `bushart_session` httpOnly
 * cookie. This is the security boundary; `proxy.ts` is only a UX redirect.
 *
 * Phase 1 ships the guard stub so Phase 2 auth work can wire into an existing
 * contract without changing this file's outer shape. TODO-007/009 will provide
 * `verifyToken` and replace the placeholder body below.
 *
 * @returns The admin profile payload when authenticated.
 * @throws {Response} 401 UNAUTHENTICATED / 501 NOT_IMPLEMENTED during Phase 1.
 */
export async function requireAdmin(request: NextRequest): Promise<{ id: string; username: string }> {
  // Phase 1 stub: replaced by TODO-007/009 with real JWT verification.
  // Kept as a runtime stub (not a compile-time import) so the build stays green.
  if (process.env.NODE_ENV !== "test") {
    throw new Response(
      JSON.stringify({
        error: {
          code: "NOT_IMPLEMENTED",
          message: "Auth guard not yet implemented",
          details: {},
        },
      }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return { id: "stub", username: "stub" };
}
