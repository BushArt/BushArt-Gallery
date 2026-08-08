import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bushart_session";

/**
 * proxy.ts — Next.js 16 Edge Proxy
 *
 * UX-layer redirect only. This file MUST NOT be treated as the security
 * boundary for admin-protected routes. Every admin Route Handler must
 * independently re-verify the session server-side (see lib/auth/guard.ts).
 *
 * This mitigates CVE-2025-29927, a disclosed vulnerability class where
 * proxy-only session gating in Next.js could be bypassed via a spoofed
 * internal header. See 02-Technical-Specification.md §4 for the full
 * defense-in-depth requirement.
 *
 * This proxy handles UX-layer redirects for admin UI routes: if an
 * unauthenticated visitor lands on an admin page, they are redirected to
 * the homepage before any admin-only UI flashes on screen. The actual
 * security check happens in each Route Handler via requireAdmin(), which
 * independently verifies the JWT signature server-side.
 *
 * Note: This file runs in the Edge runtime and cannot import Node.js
 * modules like node:crypto. It checks only for cookie presence — the
 * JWT signature verification happens exclusively in guard.ts, which runs
 * in the Node.js runtime.
 */

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to admin UI routes (not API routes — those are guarded by
  // requireAdmin() in each handler, not by proxy).
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // UX redirect only — the actual session verification happens in guard.ts
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
