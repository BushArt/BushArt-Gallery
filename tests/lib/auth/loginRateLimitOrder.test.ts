import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

// The whole point is proving the limiter gates this lookup. Mocking the model
// (rather than the driver) keeps the test on the pure Node side, so it runs in
// the `unit` project with no database — the route's other dependencies are
// real, including the rate limiter under test.
//
// `vi.hoisted` runs before `vi.mock` is hoisted, so the spy exists by the time
// the factory below references it.
const { getAdminByUsername } = vi.hoisted(() => ({
  getAdminByUsername: vi.fn(),
}));

vi.mock("@/lib/db/models/admin", () => ({
  getAdminByUsername,
  updateLoginState: vi.fn(async () => undefined),
  findLockoutStateByUsername: vi.fn(async () => null),
  findByUsername: vi.fn(async () => null),
}));

vi.mock("@/lib/auth/password", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/password")>()),
  verifyPassword: vi.fn(async () => true),
}));

vi.mock("@/lib/auth/jwt", () => ({
  signToken: vi.fn(() => "token"),
  TOKEN_EXPIRY_SECONDS: 3600,
}));

// ── Import after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/auth/login/route";
import { clearRateLimits } from "@/lib/auth/rateLimit";

const LOCKED_ADMIN = {
  id: "507f1f77bcf86cd799439011",
  username: "bush",
  passwordHash: "hashed",
  failedLoginAttempts: 5,
  lockUntil: new Date(Date.now() + 5 * 60 * 1000),
  lastLoginAt: null,
  tokenVersion: 0,
  createdAt: new Date(),
};

function attempt(): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "bush", password: "correct-password" }),
  });
}

describe("POST /api/auth/login — rate limiter ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimits();
    getAdminByUsername.mockResolvedValue(LOCKED_ADMIN);
  });

  it("consults the database for an attempt inside the rate-limit budget", async () => {
    const res = await POST(attempt());

    // Within budget, so the route proceeds to the lookup (and reports the lock).
    expect(getAdminByUsername).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(423);
  });

  it("never reaches the database once the budget is exhausted", async () => {
    // 10 attempts exhaust RATE_LIMIT_MAX_ATTEMPTS; each one still queries.
    for (let i = 0; i < 10; i++) {
      await POST(attempt());
    }
    vi.clearAllMocks();

    const res = await POST(attempt());

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe("TOO_MANY_REQUESTS");
    // The regression this guards: the limiter used to run *after*
    // `getAdminByUsername`, so every throttled request still cost a round trip.
    expect(getAdminByUsername).not.toHaveBeenCalled();
  });

  it("answers 423, not 429, for a locked account while budget remains", async () => {
    // Documents the observable change: a locked account is only told it is
    // rate limited once it actually exceeds the allowance.
    const res = await POST(attempt());

    expect(res.status).toBe(423);
    expect((await res.json()).error.code).toBe("LOCKED");
  });

  it("reaches the database again for a different ip/username pair", async () => {
    for (let i = 0; i < 10; i++) {
      await POST(attempt());
    }

    // A distinct pair has its own budget, so one caller cannot lock out others.
    const res = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.9",
        },
        body: JSON.stringify({ username: "bush", password: "correct-password" }),
      }),
    );

    expect(res.status).toBe(423);
    expect(getAdminByUsername).toHaveBeenCalled();
  });
});
