import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { handleRouteError } from "@/lib/api/errors";
import { getAdminByUsername, incrementTokenVersion } from "@/lib/db/models/admin";

const SESSION_COOKIE = "bushart_session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (token) {
      try {
        const payload = verifyToken(token);
        if (payload?.username) {
          const admin = await getAdminByUsername(payload.username);
          if (admin) {
            await incrementTokenVersion(admin.id);
          }
        }
      } catch {
        // Token may be invalid; still clear the cookie
      }
    }

    const response = new NextResponse(null, { status: 200 });
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https:") ?? process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error) {
    return handleRouteError(error, "POST /api/auth/logout");
  }
}
