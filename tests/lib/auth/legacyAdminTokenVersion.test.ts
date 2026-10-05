import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// `signToken` reads this from the environment; without it every login 500s and
// the test would fail for the wrong reason.
vi.stubEnv("JWT_SECRET", "unit-test-secret-minimum-32-characters-long");

// ── Why the claim must be present ───────────────────────────────────────────
//
// `tokenVersion` was added to the admins document by a commit that has never
// shipped, so an admin seeded before it has no such field. `JSON.stringify`
// drops an `undefined` claim, and `TokenClaimsSchema` requires it — so if login
// signs a token without it, `verifyToken` rejects the very cookie login just
// issued and every subsequent request is 401. A silent, permanent lockout.
//
// The defaulting itself is covered by tests/db/models/admin.test.ts, which
// drives the real mapper. This file covers the wiring: that a mapper result of
// 0 produces a token the security boundary accepts.

const { getAdminByUsername } = vi.hoisted(() => ({
  getAdminByUsername: vi.fn(),
}));

vi.mock("@/lib/db/models/admin", () => ({
  getAdminByUsername,
  updateLoginState: vi.fn(async () => undefined),
  findLockoutStateByUsername: vi.fn(async () => null),
  // requireAdmin resolves the session through findByUsername, so this must
  // return the admin — a null here produces an unrelated 401.
  findByUsername: vi.fn(async () => ({
    id: "507f1f77bcf86cd799439011",
    username: "bush",
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    tokenVersion: 0,
  })),
  incrementTokenVersion: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth/password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/password")>()),
  verifyPassword: vi.fn(async () => true),
}));

// ── Import after mocks ───────────────────────────────────────────────────────

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { requireAdmin } from "@/lib/auth/guard";
import { clearRateLimits } from "@/lib/auth/rateLimit";
import { setIndexesVerified } from "@/lib/db/indexReady";
import { signToken } from "@/lib/auth/jwt";

/** What the model returns for a document that predates `tokenVersion`. */
const NORMALISED_ADMIN = {
  id: "507f1f77bcf86cd799439011",
  username: "bush",
  passwordHash: "hashed",
  failedLoginAttempts: 0,
  lockUntil: null,
  lastLoginAt: null,
  createdAt: new Date(),
  // `tokenVersionOf` in models/admin.ts normalises a missing field to 0.
  tokenVersion: 0,
};

function loginRequest() {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "bush", password: "correct-password" }),
  });
}

/** Pull the raw `bushart_session` value out of a Set-Cookie header. */
function sessionCookie(setCookie: string | null): string {
  expect(setCookie).toBeTruthy();
  const match = setCookie!.match(/bushart_session=([^;]*)/);
  expect(match).toBeTruthy();
  return match![1];
}

function guardedRequest(token: string): NextRequest {
  const req = new NextRequest("http://localhost/api/artworks", { method: "POST" });
  req.cookies.set("bushart_session", token);
  return req;
}

describe("tokenVersion claim — login must not lock the admin out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimits();
    // requireAdmin refuses work until boot verified the indexes (see the
    // indexReady module); that gate is unrelated to what is under test here.
    setIndexesVerified();
    getAdminByUsername.mockResolvedValue({ ...NORMALISED_ADMIN });
  });

  it("accepts the cookie login just issued", async () => {
    const res = await login(loginRequest());
    expect(res.status).toBe(200);

    const token = sessionCookie(res.headers.get("set-cookie"));

    // The cookie login just issued must be accepted by the security boundary.
    // If the claim were missing this throws 401 UNAUTHENTICATED forever.
    await expect(requireAdmin(guardedRequest(token))).resolves.toEqual({
      id: NORMALISED_ADMIN.id,
      username: NORMALISED_ADMIN.username,
    });
  });

  it("still revokes the session after logout", async () => {
    const token = signToken({
      id: NORMALISED_ADMIN.id,
      username: NORMALISED_ADMIN.username,
      jti: "11111111-1111-1111-1111-111111111111",
      tokenVersion: 0,
    });

    const req = new NextRequest("http://localhost/api/auth/logout", { method: "POST" });
    req.cookies.set("bushart_session", token);
    const res = await logout(req);

    expect(res.status).toBe(200);
    const { incrementTokenVersion } = await import("@/lib/db/models/admin");
    expect(incrementTokenVersion).toHaveBeenCalledWith(NORMALISED_ADMIN.id);
  });
});