import { NextResponse } from "next/server";

const SESSION_COOKIE = "bushart_session";

export async function POST(): Promise<NextResponse> {
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
}
