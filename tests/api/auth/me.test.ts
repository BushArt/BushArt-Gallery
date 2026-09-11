import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { withSessionCookie } from "../../helpers";
import {
  getTestDb,
  clearCollections,
  closeTestDb,
  createMongodbMock,
} from "../../helpers";

// Mock the mongodb module to redirect to test database
vi.mock("@/lib/db/mongodb", () => createMongodbMock());

vi.mock("@/lib/auth/jwt", () => ({
  verifyToken: vi.fn((token: string) => {
    if (token === "valid-token") {
      return { id: "507f1f77bcf86cd799439011", username: "bush" };
    }
    return null;
  }),
}));

import { GET } from "@/app/api/auth/me/route";
import { verifyToken } from "@/lib/auth/jwt";

function createMeRequest(cookieValue?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/auth/me", {
    method: "GET",
  });
  if (cookieValue !== undefined) {
    return withSessionCookie(req, cookieValue);
  }
  return req;
}

async function seedAdmin(overrides: Record<string, unknown> = {}) {
  const db = await getTestDb();
  const admin = {
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    id: "507f1f77bcf86cd799439011",
    username: "bush",
    passwordHash: "hashed-secret",
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    ...overrides,
  };
  await db.collection("admins").insertOne(admin);
  return admin;
}

beforeEach(async () => {
  await clearCollections(["admins"]);
  vi.clearAllMocks();
});

afterAll(async () => {
  await closeTestDb();
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
    await seedAdmin();

    const req = createMeRequest("valid-token");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      id: "507f1f77bcf86cd799439011",
      username: "bush",
    });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 200 {authenticated: false} when JWT is valid but admin record is missing", async () => {
    // No admin seeded - a valid token with a deleted/missing
    // admin must be treated as unauthenticated (200), not an error (401/500).
    const req = createMeRequest("valid-token");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ authenticated: false });
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
    await seedAdmin({
      failedLoginAttempts: 5,
      lockUntil,
    });

    const req = createMeRequest("valid-token");
    const res = await GET(req);
    expect(res.status).toBe(423);
    const json = await res.json();
    expect(json.error.code).toBe("LOCKED");
    expect(json.error.details.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
