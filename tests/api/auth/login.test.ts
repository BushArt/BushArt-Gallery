import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { createLoginRequest } from "../../helpers";
import {
  getTestDb,
  clearCollections,
  closeTestDb,
  createMongodbMock,
} from "../../helpers";

// Mock the mongodb module to redirect to test database
vi.mock("@/lib/db/mongodb", () => createMongodbMock());

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(
    async (password: string, hash: string) => password === "correct-password",
  ),
}));

vi.mock("@/lib/auth/jwt", () => ({
  signToken: vi.fn(
    (payload: { id: string; username: string }) =>
      `mock-token.${payload.id}.${payload.username}`,
  ),
  TOKEN_EXPIRY_SECONDS: 60 * 60 * 24 * 7,
}));

import { POST } from "@/app/api/auth/login/route";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";

async function seedAdmin(overrides: Record<string, unknown> = {}) {
  const db = await getTestDb();
  const id = new ObjectId();
  const admin = {
    _id: id,
    id: id.toHexString(),
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
    await seedAdmin();
    const req = createLoginRequest({
      username: "bush",
      password: "wrong-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns identical response for wrong username and wrong password (timing safety)", async () => {
    await seedAdmin();
    const wrongUserReq = createLoginRequest({
      username: "ghost",
      password: "any",
    });
    const wrongPassReq = createLoginRequest({
      username: "bush",
      password: "wrong",
    });

    const wrongUserRes = await POST(wrongUserReq);
    const wrongPassRes = await POST(wrongPassReq);
    const wrongUserJson = await wrongUserRes.json();
    const wrongPassJson = await wrongPassRes.json();

    expect(wrongUserRes.status).toBe(wrongPassRes.status);
    expect(wrongUserJson).toEqual(wrongPassJson);
  });

  it("returns 423 LOCKED with retryAfterSeconds when account is locked", async () => {
    const lockUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future
    await seedAdmin({ failedLoginAttempts: 5, lockUntil });

    const req = createLoginRequest({
      username: "bush",
      password: "correct-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(423);
    const json = await res.json();
    expect(json.error.code).toBe("LOCKED");
    expect(json.error.details.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("returns 200 and sets cookie with correct attributes on successful login", async () => {
    const admin = await seedAdmin();
    const req = createLoginRequest({
      username: "bush",
      password: "correct-password",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);

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

    expect(signToken).toHaveBeenCalledWith({
      id: admin.id,
      username: "bush",
    });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("resets lockout state on successful login", async () => {
    const admin = await seedAdmin({
      failedLoginAttempts: 3,
      lockUntil: null,
    });
    const req = createLoginRequest({
      username: "bush",
      password: "correct-password",
    });
    await POST(req);

    // Verify the admin record was updated
    const db = await getTestDb();
    const updated = await db
      .collection("admins")
      .findOne({ _id: new ObjectId(admin.id) });
    expect(updated?.failedLoginAttempts).toBe(0);
    expect(updated?.lockUntil).toBeNull();
  });

  it("increments failedLoginAttempts on wrong password and persists", async () => {
    const admin = await seedAdmin({ failedLoginAttempts: 0 });
    const req = createLoginRequest({
      username: "bush",
      password: "wrong-password",
    });
    await POST(req);

    expect(verifyPassword).toHaveBeenCalledWith(
      "wrong-password",
      "hashed-secret",
    );

    // Verify the admin record was updated
    const db = await getTestDb();
    const updated = await db
      .collection("admins")
      .findOne({ _id: new ObjectId(admin.id) });
    expect(updated?.failedLoginAttempts).toBe(1);
  });

  it("returns 423 LOCKED when the failed attempt triggers the lock threshold", async () => {
    // 4 previous failures — one more triggers the lock at 5
    await seedAdmin({ failedLoginAttempts: 4, lockUntil: null });

    const req = createLoginRequest({
      username: "bush",
      password: "wrong-password",
    });
    const res = await POST(req);

    expect(res.status).toBe(423);
    const json = await res.json();
    expect(json.error.code).toBe("LOCKED");
    expect(json.error.details.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("does not call verifyPassword when account is locked", async () => {
    const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
    await seedAdmin({ failedLoginAttempts: 5, lockUntil });

    const req = createLoginRequest({
      username: "bush",
      password: "correct-password",
    });
    await POST(req);

    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("does not call verifyPassword when username does not exist", async () => {
    const req = createLoginRequest({ username: "ghost", password: "any" });
    await POST(req);

    expect(verifyPassword).not.toHaveBeenCalled();
  });
});
