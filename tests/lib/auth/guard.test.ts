import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth/jwt", () => ({
  verifyToken: vi.fn((token: string) => {
    if (token === "valid-token") {
      return { id: "507f1f77bcf86cd799439011", username: "bush" };
    }
    return null;
  }),
}));

vi.mock("@/lib/db/models/admin", () => ({
  findByUsername: vi.fn(async () => ({
    id: "507f1f77bcf86cd799439011",
    username: "bush",
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
  })),
  getAdminByUsername: vi.fn(),
  updateLoginState: vi.fn(),
  createAdmin: vi.fn(),
  findAdminById: vi.fn(),
}));

// ── Import after mocks ─────────────────────────────────────────────────────

import { requireAdmin } from "@/lib/auth/guard";
import { verifyToken } from "@/lib/auth/jwt";
import { findByUsername } from "@/lib/db/models/admin";

// ── Helpers ────────────────────────────────────────────────────────────────

function createGuardedRequest(cookieValue?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/artworks", { method: "POST" });
  if (cookieValue !== undefined) {
    req.cookies.set("bushart_session", cookieValue);
  }
  return req;
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAdmin (guard.ts)", () => {
  it("throws 401 UNAUTHENTICATED Response when no cookie is present — regression: handler rejects without proxy.ts", async () => {
    // This is the critical regression test: a request with no session cookie
    // must be rejected at the handler level by requireAdmin(), independently
    // of proxy.ts. This proves the CVE-2025-29927 defense-in-depth requirement.
    const req = createGuardedRequest();

    const error = await requireAdmin(req).catch((e) => e);
    if (!(error instanceof Response)) {
      throw new Error("Expected Response");
    }
    expect(error.status).toBe(401);
    const json = await error.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
    expect(json.error.message).toBe("No valid session");
  });

  it("throws 401 UNAUTHENTICATED Response when token is invalid/tampered", async () => {
    const req = createGuardedRequest("tampered-token");

    await expect(requireAdmin(req)).rejects.toMatchObject({
      status: 401,
    });

    expect(verifyToken).toHaveBeenCalledWith("tampered-token");
  });

  it("returns admin profile when token is valid", async () => {
    const req = createGuardedRequest("valid-token");

    const profile = await requireAdmin(req);

    expect(profile).toEqual({ id: "507f1f77bcf86cd799439011", username: "bush" });
  });

  it("throws 423 LOCKED when account is locked", async () => {
    vi.mocked(findByUsername).mockResolvedValueOnce({
      id: "507f1f77bcf86cd799439011",
      username: "bush",
      failedLoginAttempts: 5,
      lockUntil: new Date(Date.now() + 1000),
      lastLoginAt: null,
      createdAt: new Date(),
    });

    const req = createGuardedRequest("valid-token");

    const error = await requireAdmin(req).catch((e) => e);
    if (!(error instanceof Response)) {
      throw new Error("Expected Response");
    }
    expect(error.status).toBe(423);
    const json = await error.json();
    expect(json.error.code).toBe("LOCKED");
    expect(json.error.details.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("throws 401 UNAUTHENTICATED when admin account no longer exists", async () => {
    vi.mocked(findByUsername).mockResolvedValueOnce(null);

    const req = createGuardedRequest("valid-token");

    const error = await requireAdmin(req).catch((e) => e);
    if (!(error instanceof Response)) {
      throw new Error("Expected Response");
    }
    expect(error.status).toBe(401);
    const json = await error.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
    expect(json.error.message).toBe("No valid session");
  });

});