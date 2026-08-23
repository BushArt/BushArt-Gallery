import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/errors";

const SESSION_COOKIE = "bushart_session";

export async function POST(): Promise<NextResponse> {
  try {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error) {
    return handleRouteError(error, "POST /api/auth/logout");
  }
}
