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
  findByUsername: vi.fn(async () => null),
}));

// ── Import after mocks ─────────────────────────────────────────────────────

import { GET } from "@/app/api/auth/me/route";
import { verifyToken } from "@/lib/auth/jwt";
import { findByUsername } from "@/lib/db/models/admin";

// ── Helpers ────────────────────────────────────────────────────────────────

function createMeRequest(cookieValue?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/auth/me", { method: "GET" });
  if (cookieValue !== undefined) {
    req.cookies.set("bushart_session", cookieValue);
  }
  return req;
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/me", () => {
  it("returns 200 {authenticated: false} when no cookie is present", async () => {
    const req = createMeRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ authenticated: false });
  });

  it("returns 200 {authenticated: false} when token is invalid/tampered", async () => {
    const req = createMeRequest("tampered-token");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ authenticated: false });
    expect(verifyToken).toHaveBeenCalledWith("tampered-token");
  });

  it("returns 200 {id, username} when token is valid", async () => {
    vi.mocked(findByUsername).mockResolvedValueOnce({
      id: "507f1f77bcf86cd799439011",
      username: "bush",
      failedLoginAttempts: 0,
      lockUntil: null,
      lastLoginAt: null,
      createdAt: new Date(),
    } as any);

    const req = createMeRequest("valid-token");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ id: "507f1f77bcf86cd799439011", username: "bush" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not return 401 for unauthenticated requests — 200 is deliberate", async () => {
    const req = createMeRequest();
    const res = await GET(req);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });

  it("returns 423 LOCKED when the admin account is locked", async () => {
    const lockUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future
    vi.mocked(findByUsername).mockResolvedValueOnce({
      id: "507f1f77bcf86cd799439011",
      username: "bush",
      failedLoginAttempts: 5,
      lockUntil,
      lastLoginAt: null,
      createdAt: new Date(),
    } as any);

    const req = createMeRequest("valid-token");
    const res = await GET(req);
    expect(res.status).toBe(423);
    const json = await res.json();
    expect(json.error.code).toBe("LOCKED");
    expect(json.error.details.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
