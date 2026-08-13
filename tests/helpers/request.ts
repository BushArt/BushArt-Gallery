import { NextRequest } from "next/server";

export function createJsonRequest(
  method: string,
  url: string,
  body?: unknown,
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export function withSessionCookie(
  req: NextRequest,
  token: string,
): NextRequest {
  req.cookies.set("bushart_session", token);
  return req;
}

export function createLoginRequest(body: unknown): NextRequest {
  return createJsonRequest("POST", "http://localhost/api/auth/login", body);
}
