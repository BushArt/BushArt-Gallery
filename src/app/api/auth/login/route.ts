import { NextRequest, NextResponse } from "next/server";
import { LoginRequestSchema } from "@/lib/validation/auth";
import {
  getAdminByUsername,
  updateLoginState,
  findLockoutStateByUsername,
} from "@/lib/db/models/admin";
import { verifyPassword } from "@/lib/auth/password";
import { DUMMY_PASSWORD_HASH } from "@/lib/auth/password";
import { signToken, TOKEN_EXPIRY_SECONDS } from "@/lib/auth/jwt";
import { isLocked, recordFailedAttempt, recordSuccessfulLogin } from "@/lib/auth/lockout";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rateLimit";
import { apiError, handleRouteError } from "@/lib/api/errors";

const SESSION_COOKIE = "bushart_session";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  // `NextRequest.ip` was removed in Next 16; the platform-provided headers are
  // the supported sources. Render always sets X-Forwarded-For, so the
  // fallbacks here only matter for local/self-hosted requests.
  return (
    request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("cf-connecting-ip")?.trim() ??
    "unknown"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
  }

  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Validation failed",
    );
  }

  const { username, password } = parsed.data;
  const now = new Date();
  const clientIp = getClientIp(request);

  try {
    // Rate limit first — it is an in-memory check that costs nothing, so it
    // must gate the database lookup below. Checking after `getAdminByUsername`
    // let an attacker force one MongoDB query per request simply by cycling
    // usernames, and let a locked account burn unlimited attempts without ever
    // consuming budget (the lockout branch returned before the check ran).
    const rateCheck = checkRateLimit(clientIp, username);
    if (!rateCheck.allowed) {
      return apiError(429, "TOO_MANY_REQUESTS", "Too many login attempts", {
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      });
    }

    const admin = await getAdminByUsername(username);

    if (admin && isLocked(admin.lockUntil, now)) {
      const retryAfterSeconds = Math.ceil((admin.lockUntil!.getTime() - now.getTime()) / 1000);
      return apiError(423, "LOCKED", "Account is temporarily locked", { retryAfterSeconds });
    }

    const passwordValid = await verifyPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!admin || !passwordValid) {
      const failedState = recordFailedAttempt(
        admin
          ? { failedLoginAttempts: admin.failedLoginAttempts, lockUntil: admin.lockUntil }
          : { failedLoginAttempts: 0, lockUntil: null },
        now,
      );

      if (admin) {
        await updateLoginState(admin.id, {
          failedLoginAttempts: failedState.failedLoginAttempts,
          lockUntil: failedState.lockUntil,
          lastLoginAt: admin.lastLoginAt,
        });
      }

      if (isLocked(failedState.lockUntil, now)) {
        const retryAfterSeconds = Math.ceil(
          (failedState.lockUntil!.getTime() - now.getTime()) / 1000,
        );
        return apiError(423, "LOCKED", "Account is temporarily locked", { retryAfterSeconds });
      }

      return apiError(401, "UNAUTHENTICATED", "Invalid username or password");
    }

    resetRateLimit(clientIp, username);

    const currentLockout = await findLockoutStateByUsername(admin.username);
    if (currentLockout && isLocked(currentLockout.lockUntil, now)) {
      const retryAfterSeconds = Math.ceil(
        (currentLockout.lockUntil!.getTime() - now.getTime()) / 1000,
      );
      return apiError(423, "LOCKED", "Account is temporarily locked", { retryAfterSeconds });
    }

    const successState = recordSuccessfulLogin(now);
    await updateLoginState(admin.id, {
      failedLoginAttempts: successState.failedLoginAttempts,
      lockUntil: successState.lockUntil,
      lastLoginAt: successState.lastLoginAt,
    });

    const token = signToken({
      id: admin.id,
      username: admin.username,
      jti: crypto.randomUUID(),
      tokenVersion: admin.tokenVersion,
    });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https:") ?? process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_EXPIRY_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    return handleRouteError(error, "POST /api/auth/login");
  }
}
