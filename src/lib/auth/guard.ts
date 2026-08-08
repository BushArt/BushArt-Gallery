import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { isLocked } from "@/lib/auth/lockout";
import { findByUsername } from "@/lib/db/models/admin";

/**
 * Server-side auth guard for admin Route Handlers.
 *
 * Independently re-verifies the session from the `bushart_session` httpOnly
 * cookie. This is the security boundary; `proxy.ts` is only a UX redirect.
 *
 * Every admin-mutating Route Handler MUST call this before performing any
 * read of admin-only data or any write, regardless of what `proxy.ts` already
 * checked. This is the direct mitigation for CVE-2025-29927, where
 * middleware-only session gating could be bypassed via a spoofed internal
 * header.
 *
 * @returns The admin profile payload when authenticated.
 * @throws {Response} 401 UNAUTHENTICATED if no valid session cookie is present.
 */
export async function requireAdmin(request: NextRequest): Promise<{ id: string; username: string }> {
  const token = request.cookies.get("bushart_session")?.value;

  if (!token) {
    throw NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "No valid session",
          details: {},
        },
      },
      { status: 401 },
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    throw NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "No valid session",
          details: {},
        },
      },
      { status: 401 },
    );
  }

  // Verify the admin account still exists
  const admin = await findByUsername(payload.username);
  if (!admin) {
    throw NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "No valid session",
          details: {},
        },
      },
      { status: 401 },
    );
  }

  // Check if the admin account is currently locked
  if (isLocked(admin.lockUntil, new Date())) {
    throw NextResponse.json(
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
  }

  return { id: payload.id, username: payload.username };
}