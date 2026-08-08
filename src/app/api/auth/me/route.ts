import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { isLocked } from "@/lib/auth/lockout";
import { findByUsername } from "@/lib/db/models/admin";

const SESSION_COOKIE = "bushart_session";

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // Verify the admin account still exists
    const admin = await findByUsername(payload.username);
    if (!admin) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    // Check if the admin account is currently locked
    if (isLocked(admin.lockUntil, new Date())) {
      const response = NextResponse.json(
        {
          error: {
            code: "LOCKED",
            message: "Account is temporarily locked",
            details: {
              retryAfterSeconds: Math.ceil((admin.lockUntil!.getTime() - Date.now()) / 1000),
            },
          },
        },
        { status: 423 },
      );
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    const response = NextResponse.json({ id: payload.id, username: payload.username }, { status: 200 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Me endpoint error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          details: {},
        },
      },
      { status: 500 },
    );
  }
}


