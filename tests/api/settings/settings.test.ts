import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import {
  getTestDb,
  clearCollections,
  closeTestDb,
  createMongodbMock,
} from "../../helpers";

// Mock the mongodb module to redirect to test database
vi.mock("@/lib/db/mongodb", () => createMongodbMock());

// Mock auth guard — PATCH is admin-gated
vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/settings/route";
import { requireAdmin } from "@/lib/auth/guard";

describe("GET /api/settings", () => {
  beforeEach(async () => {
    await clearCollections(["site_settings"]);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns empty defaults when no settings document exists", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.artistName).toBe("");
    expect(json.socialLinks).toEqual([]);
    expect(json.tagline).toBeNull();
  });

  it("returns populated settings without url on image assets", async () => {
    const db = await getTestDb();
    await db.collection("site_settings").insertOne({
      artistName: "Bush",
      tagline: "Gallery",
      biography: "Bio",
      profileImage: {
        publicId: "bushart/site/profile",
        url: "https://res.cloudinary.com/test/image/upload/profile",
        width: 800,
        height: 800,
        order: 0,
      },
      bannerImage: null,
      socialLinks: [
        { platform: "Instagram", url: "https://instagram.com/example" },
      ],
      contactEmail: "hello@example.com",
      contactUrl: null,
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const res = await GET();
    const json = await res.json();
    expect(json.artistName).toBe("Bush");
    expect(json.profileImage).toEqual({
      publicId: "bushart/site/profile",
      width: 800,
      height: 800,
    });
    expect(json).not.toHaveProperty("updatedAt");
  });

  it("returns populated settings", async () => {
    const db = await getTestDb();
    await db.collection("site_settings").insertOne({
      artistName: "Bush",
      tagline: "Gallery",
      biography: "Bio",
      profileImage: null,
      bannerImage: null,
      socialLinks: [
        { platform: "Instagram", url: "https://instagram.com/example" },
      ],
      contactEmail: "hello@example.com",
      contactUrl: null,
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const res = await GET();
    const json = await res.json();
    expect(json.artistName).toBe("Bush");
    expect(json).not.toHaveProperty("updatedAt");
  });
});

describe("PATCH /api/settings", () => {
  beforeEach(async () => {
    await clearCollections(["site_settings"]);
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), {
        status: 401,
      }),
    );
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagline: "New" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("succeeds on zero-state first PATCH before any settings document exists", async () => {
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistName: "Bush",
        tagline: "New tagline",
        socialLinks: [],
      }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tagline).toBe("New tagline");

    // Verify persistence
    const db = await getTestDb();
    const saved = await db.collection("site_settings").findOne({});
    expect(saved?.artistName).toBe("Bush");
    expect(saved?.tagline).toBe("New tagline");
  });

  it("returns 400 when first PATCH omits artistName on zero-state", async () => {
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagline: "New tagline", socialLinks: [] }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.field).toBe("artistName");
  });

  it("returns 400 VALIDATION_ERROR for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid email", async () => {
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactEmail: "not-an-email" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates existing settings on second PATCH", async () => {
    // First create settings
    const db = await getTestDb();
    await db.collection("site_settings").insertOne({
      artistName: "Original",
      tagline: "Original tagline",
      biography: null,
      profileImage: null,
      bannerImage: null,
      socialLinks: [],
      contactEmail: null,
      contactUrl: null,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    // Now update
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagline: "Updated tagline" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.artistName).toBe("Original");
    expect(json.tagline).toBe("Updated tagline");
  });
});
