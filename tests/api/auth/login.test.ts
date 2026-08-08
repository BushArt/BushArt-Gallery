import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockAdmins: Map<string, any> = new Map();

vi.mock("@/lib/db/models/admin", () => ({
  getAdminByUsername: vi.fn(async (username: string) => mockAdmins.get(username) ?? null),
  updateLoginState: vi.fn(async (id: string, data: any) => {
    for (const admin of mockAdmins.values()) {
      if (admin.id === id) {
        admin.failedLoginAttempts = data.failedLoginAttempts;
        admin.lockUntil = data.lockUntil;
        admin.lastLoginAt = data.lastLoginAt;
      }
    }
  }),
  findLockoutStateByUsername: vi.fn(async (username: string) => {
    const admin = mockAdmins.get(username);
    if (!admin) return null;
    return {
      failedLoginAttempts: admin.failedLoginAttempts,
      lockUntil: admin.lockUntil,
    };
  }),
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(async (password: string, hash: string) => password === "correct-password"),
}));

vi.mock("@/lib/auth/jwt", () => ({
  signToken: vi.fn((payload: { id: string; username: string }) => `mock-token.${payload.id}.${payload.username}`),
  TOKEN_EXPIRY_SECONDS: 60 * 60 * 24 * 7,
}));

// Use the real lockout module — it's pure functions, no DB calls.

// ── Import after mocks ─────────────────────────────────────────────────────

import { POST } from "@/app/api/auth/login/route";
import { getAdminByUsername, updateLoginState } from "@/lib/db/models/admin";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";

// ── Helpers ────────────────────────────────────────────────────────────────

function createLoginRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function seedAdmin(overrides: Partial<any> = {}): any {
  const id = new ObjectId().toHexString();
  const admin = {
    id,
    username: "bush",
    passwordHash: "hashed-secret",
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    ...overrides,
  };
  mockAdmins.set(admin.username, admin);
  return admin;
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockAdmins.clear();
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("returns 400 VALIDATION_ERROR when username is missing", async () => {
    const req = createLoginRequest({ password: "some-password" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when password is missing", async () => {
    const req = createLoginRequest({ username: "bush" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 UNAUTHENTICATED when username does not exist", async () => {
    const req = createLoginRequest({ username: "ghost", password: "any" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 UNAUTHENTICATED when password is wrong", async () => {
    seedAdmin();
    const req = createLoginRequest({ username: "bush", password: "wrong-password" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns identical 401 response for wrong username vs wrong password", async () => {
    seedAdmin();

    const wrongUserReq = createLoginRequest({ username: "ghost", password: "any" });
    const wrongUserRes = await POST(wrongUserReq);
    const wrongUserJson = await wrongUserRes.json();

    const wrongPassReq = createLoginRequest({ username: "bush", password: "wrong-password" });
    const wrongPassRes = await POST(wrongPassReq);
    const wrongPassJson = await wrongPassRes.json();

    expect(wrongUserRes.status).toBe(wrongPassRes.status);
    expect(wrongUserJson).toEqual(wrongPassJson);
  });

  it("returns 423 LOCKED with retryAfterSeconds when account is locked", async () => {
    const lockUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future
    seedAdmin({ failedLoginAttempts: 5, lockUntil });

    const req = createLoginRequest({ username: "bush", password: "correct-password" });
    const res = await POST(req);
    expect(res.status).toBe(423);
    const json = await res.json();
    expect(json.error.code).toBe("LOCKED");
    expect(json.error.details.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("returns 200 and sets cookie with correct attributes on successful login", async () => {
    const admin = seedAdmin();
    const req = createLoginRequest({ username: "bush", password: "correct-password" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.body).toBe(null); // empty body per spec

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("bushart_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie!.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).toContain("Path=/");

    // Secure flag is environment-dependent
    const hasSecure = setCookie!.toLowerCase().includes("secure");
    if (process.env.NODE_ENV === "production") {
      expect(hasSecure).toBe(true);
    }

    expect(signToken).toHaveBeenCalledWith({ id: admin.id, username: "bush" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("resets lockout state on successful login", async () => {
    const admin = seedAdmin({ failedLoginAttempts: 3, lockUntil: null });
    const req = createLoginRequest({ username: "bush", password: "correct-password" });
    await POST(req);

    expect(updateLoginState).toHaveBeenCalledWith(
      admin.id,
      expect.objectContaining({
        failedLoginAttempts: 0,
        lockUntil: null,
      }),
    );
  });

  it("increments failedLoginAttempts on wrong password and persists", async () => {
    const admin = seedAdmin({ failedLoginAttempts: 0 });
    const req = createLoginRequest({ username: "bush", password: "wrong-password" });
    await POST(req);

    expect(verifyPassword).toHaveBeenCalledWith("wrong-password", "hashed-secret");
    expect(updateLoginState).toHaveBeenCalledWith(
      admin.id,
      expect.objectContaining({
        failedLoginAttempts: 1,
      }),
    );
  });

  it("returns 423 LOCKED when the failed attempt triggers the lock threshold", async () => {
    // 4 previous failures — one more triggers the lock at 5
    seedAdmin({ failedLoginAttempts: 4, lockUntil: null });

    const req = createLoginRequest({ username: "bush", password: "wrong-password" });
    const res = await POST(req);

    expect(res.status).toBe(423);
    const json = await res.json();
    expect(json.error.code).toBe("LOCKED");
    expect(json.error.details.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("does not call verifyPassword when account is locked", async () => {
    const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
    seedAdmin({ failedLoginAttempts: 5, lockUntil });

    const req = createLoginRequest({ username: "bush", password: "correct-password" });
    await POST(req);

    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("does not call verifyPassword when username does not exist", async () => {
    const req = createLoginRequest({ username: "ghost", password: "any" });
    await POST(req);

    expect(verifyPassword).not.toHaveBeenCalled();
    expect(getAdminByUsername).toHaveBeenCalledWith("ghost");
  });
});