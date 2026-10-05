import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { isLocked } from "@/lib/auth/lockout";
import { findByUsername } from "@/lib/db/models/admin";
import { areIndexesVerified } from "@/lib/db/indexReady";

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
  if (!areIndexesVerified()) {
    throw NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Service initializing — database indexes not yet verified",
          details: {},
        },
      },
      { status: 503 },
    );
  }

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

  const tokenVersion = payload.tokenVersion;
  if (tokenVersion !== undefined && tokenVersion < admin.tokenVersion) {
    throw NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Session revoked — please log in again",
          details: {},
        },
      },
      { status: 401 },
    );
  }

  return { id: payload.id, username: payload.username };
}

/**
 * Non-throwing admin check for Server Components.
 *
 * `requireAdmin` needs a `NextRequest`, which Route Handlers have but Server
 * Components do not. This variant reads the session cookie through
 * `next/headers` and applies the same verification chain (JWT signature,
 * account existence, lockout, tokenVersion revocation) — it simply answers a
 * boolean instead of throwing a 401 Response.
 *
 * Use this to decide whether to include admin-only content in a rendered page.
 * It is NOT a substitute for `requireAdmin` on a mutating Route Handler: a
 * boolean gate cannot stop a write, so the handler must still call
 * `requireAdmin` independently.
 *
 * @returns true only when a currently valid admin session is present.
 */
export async function isAdminSession(): Promise<boolean> {
  try {
    // Index-verification gating is intentionally NOT applied here: this helper
    // only decides what to render, so a booting database degrades to the
    // public view instead of a 503 error page.
    const store = await cookies();
    const token = store.get("bushart_session")?.value;
    if (!token) return false;

    const payload = verifyToken(token);
    if (!payload) return false;

    const admin = await findByUsername(payload.username);
    if (!admin) return false;
    if (isLocked(admin.lockUntil, new Date())) return false;
    if (payload.tokenVersion !== undefined && payload.tokenVersion < admin.tokenVersion) {
      return false;
    }

    return true;
  } catch {
    // Never let an auth-check failure leak content or crash the render.
    return false;
  }
}

/**
 * Whether the caller holds a valid admin session, for Route Handlers that
 * serve *both* the public and the admin view of the same resource.
 *
 * `requireAdmin` throws a `Response`: 401 when there is no valid session, 423
 * when the account is locked, and 503 while boot is still verifying database
 * indexes. Only the first is a legitimate reason to fall through to the public
 * view. The handlers that used a bare `try { ... } catch { isAdmin = false }`
 * swallowed all three, so a booting database or a locked account was
 * indistinguishable from "not logged in" — the admin got the public page, and a
 * 404 for their own NSFW artwork, with nothing in the response to explain why.
 *
 * Failures other than 401 are rethrown so the caller's own error handler
 * reports the real status (`handleRouteError` returns a `Response` untouched).
 *
 * Note this is fail-*closed* on content either way: a swallowed 503 still
 * hides NSFW artwork, so this is an observability defect rather than a leak.
 */
export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  try {
    await requireAdmin(request);
    return true;
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return false;
    }
    throw error;
  }
}
