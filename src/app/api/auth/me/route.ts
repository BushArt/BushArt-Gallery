import { NextRequest, NextResponse, connection } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { isLocked } from "@/lib/auth/lockout";
import { findByUsername } from "@/lib/db/models/admin";
import { apiError, handleRouteError } from "@/lib/api/errors";

const SESSION_COOKIE = "bushart_session";

// Reads request.cookies, which is only available at request time. Under
// Cache Components, `connection()` marks this handler as request-time
// executed so Next skips prerendering it during static generation.
export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      const response = NextResponse.json({ authenticated: false }, { status: 200 });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    const payload = verifyToken(token);

    if (!payload) {
      const response = NextResponse.json({ authenticated: false }, { status: 200 });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    // Verify the admin account still exists. A valid JWT with a missing admin
    // record is treated as unauthenticated (200 { authenticated: false }), not
    // an error — the client should simply redirect to login.
    const admin = await findByUsername(payload.username);
    if (!admin) {
      const response = NextResponse.json({ authenticated: false }, { status: 200 });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    // Check if the admin account is currently locked
    if (isLocked(admin.lockUntil, new Date())) {
      const response = apiError(423, "LOCKED", "Account is temporarily locked", {
        retryAfterSeconds: Math.ceil((admin.lockUntil!.getTime() - Date.now()) / 1000),
      });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    const response = NextResponse.json(
      { id: payload.id, username: payload.username },
      { status: 200 },
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return handleRouteError(error, "GET /api/auth/me");
  }
}
