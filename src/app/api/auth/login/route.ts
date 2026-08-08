import { NextRequest, NextResponse } from "next/server";
import { LoginRequestSchema } from "@/lib/validation/auth";
import { getAdminByUsername, updateLoginState, findLockoutStateByUsername } from "@/lib/db/models/admin";
import { verifyPassword } from "@/lib/auth/password";
import { signToken, TOKEN_EXPIRY_SECONDS } from "@/lib/auth/jwt";
import { isLocked, recordFailedAttempt, recordSuccessfulLogin } from "@/lib/auth/lockout";

const SESSION_COOKIE = "bushart_session";

function unauthenticatedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHENTICATED",
        message: "Invalid username or password",
        details: {},
      },
    },
    { status: 401 },
  );
}

function lockedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "LOCKED",
        message: "Account is temporarily locked",
        details: { retryAfterSeconds },
      },
    },
    { status: 423 },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body must be valid JSON",
          details: {},
        },
      },
      { status: 400 },
    );
  }

  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Validation failed",
          details: {},
        },
      },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;
  const now = new Date();

  try {
    const admin = await getAdminByUsername(username);

    // Check lockout status before password verification to avoid unnecessary
    // bcrypt work and to avoid revealing whether the username exists.
    if (admin && isLocked(admin.lockUntil, now)) {
      const retryAfterSeconds = Math.ceil((admin.lockUntil!.getTime() - now.getTime()) / 1000);
      return lockedResponse(retryAfterSeconds);
    }

    // If admin not found, return the identical 401 response as wrong password.
    // This prevents username enumeration.
    if (!admin) {
      return unauthenticatedResponse();
    }

    const passwordValid = await verifyPassword(password, admin.passwordHash);

    if (!passwordValid) {
      const failedState = recordFailedAttempt(
        { failedLoginAttempts: admin.failedLoginAttempts, lockUntil: admin.lockUntil },
        now,
      );
      await updateLoginState(admin.id, {
        failedLoginAttempts: failedState.failedLoginAttempts,
        lockUntil: failedState.lockUntil,
        lastLoginAt: admin.lastLoginAt,
      });

      // If the failed attempt triggered a lock, return 423 instead of 401.
      if (isLocked(failedState.lockUntil, now)) {
        const retryAfterSeconds = Math.ceil((failedState.lockUntil!.getTime() - now.getTime()) / 1000);
        return lockedResponse(retryAfterSeconds);
      }

      return unauthenticatedResponse();
    }

    // Success — re-check lockout atomically after password verification to
    // close a TOCTOU window where a concurrent login could have reset the
    // attempt counter while this request was verifying the password.
    const currentLockout = await findLockoutStateByUsername(admin.username);
    if (currentLockout && isLocked(currentLockout.lockUntil, now)) {
      const retryAfterSeconds = Math.ceil((currentLockout.lockUntil!.getTime() - now.getTime()) / 1000);
      return lockedResponse(retryAfterSeconds);
    }

    const successState = recordSuccessfulLogin(now);
    await updateLoginState(admin.id, {
      failedLoginAttempts: successState.failedLoginAttempts,
      lockUntil: successState.lockUntil,
      lastLoginAt: successState.lastLoginAt,
    });

    const token = signToken({ id: admin.id, username: admin.username });

    const response = new NextResponse(null, { status: 200 });
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_EXPIRY_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
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