import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import {
  getTestDb,
  clearCollections,
  closeTestDb,
  createMongodbMock,
} from "../../helpers";

// Mock the mongodb module to redirect to test database
vi.mock("@/lib/db/mongodb", () => createMongodbMock());

// Mock auth guard — POST and DELETE are admin-gated
vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(),
}));

import { GET, POST } from "@/app/api/tags/route";
import { DELETE } from "@/app/api/tags/[id]/route";
import { requireAdmin } from "@/lib/auth/guard";

describe("GET /api/tags", () => {
  beforeEach(async () => {
    await clearCollections(["tags"]);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns master tag list", async () => {
    const db = await getTestDb();
    await db.collection("tags").insertMany([
      {
        _id: new ObjectId(),
        name: "Gouache",
        slug: "gouache",
        usageCount: 3,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        _id: new ObjectId(),
        name: "Digital",
        slug: "digital",
        usageCount: 5,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(json.items[0].usageCount).toBe(3);
  });

  it("returns empty list when no tags exist", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
  });
});

describe("POST /api/tags", () => {
  beforeEach(async () => {
    await clearCollections(["tags"]);
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
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gouache" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 VALIDATION_ERROR for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 201 on create", async () => {
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gouache" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.slug).toBe("gouache");
  });

  it("returns 409 CONFLICT for case-insensitive duplicate name", async () => {
    const db = await getTestDb();
    await db.collection("tags").insertOne({
      _id: new ObjectId(),
      name: "gouache",
      slug: "gouache",
      usageCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gouache" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("returns 409 CONFLICT when slug already exists", async () => {
    const db = await getTestDb();
    await db.collection("tags").insertOne({
      _id: new ObjectId(),
      name: "Existing",
      slug: "gouache",
      usageCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gouache" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("persists the tag to the database", async () => {
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Watercolor" }),
    });
    await POST(req);

    const db = await getTestDb();
    const saved = await db.collection("tags").findOne({ slug: "watercolor" });
    expect(saved).toBeTruthy();
    expect(saved?.name).toBe("Watercolor");
  });
});

describe("DELETE /api/tags/:id", () => {
  let tagId: string;

  beforeEach(async () => {
    await clearCollections(["tags", "artworks"]);
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });

    const db = await getTestDb();
    const result = await db.collection("tags").insertOne({
      _id: new ObjectId(),
      name: "Deletable",
      slug: "deletable",
      usageCount: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    tagId = result.insertedId.toHexString();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 200 on cascading delete", async () => {
    const req = new NextRequest(`http://localhost/api/tags/${tagId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: tagId }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ deleted: true, id: tagId });
  });

  it("returns 404 when tag not found", async () => {
    const fakeId = new ObjectId().toHexString();
    const req = new NextRequest(`http://localhost/api/tags/${fakeId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: fakeId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), {
        status: 401,
      }),
    );
    const req = new NextRequest(`http://localhost/api/tags/${tagId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: tagId }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid ObjectId", async () => {
    const req = new NextRequest("http://localhost/api/tags/not-valid", {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "not-valid" }),
    });
    expect(res.status).toBe(400);
  });

  it("removes the tag from the database", async () => {
    const req = new NextRequest(`http://localhost/api/tags/${tagId}`, {
      method: "DELETE",
    });
    await DELETE(req, {
      params: Promise.resolve({ id: tagId }),
    });

    const db = await getTestDb();
    const deleted = await db
      .collection("tags")
      .findOne({ _id: new ObjectId(tagId) });
    expect(deleted).toBeNull();
  });

  it("cascades delete to remove tag from artworks", async () => {
    const db = await getTestDb();
    const tagObjectId = new ObjectId(tagId);

    // Create an artwork that references this tag
    await db.collection("artworks").insertOne({
      slug: "art-with-tag",
      title: "Art With Tag",
      description: null,
      medium: "Digital",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [],
      timelapse: null,
      tagIds: [tagObjectId],
      completionDate: new Date("2026-06-01T00:00:00.000Z"),
      colorPalette: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    // Delete the tag
    const req = new NextRequest(`http://localhost/api/tags/${tagId}`, {
      method: "DELETE",
    });
    await DELETE(req, {
      params: Promise.resolve({ id: tagId }),
    });

    // Verify the tag was removed from the artwork
    const artwork = await db
      .collection("artworks")
      .findOne({ slug: "art-with-tag" });
    expect(artwork?.tagIds).toHaveLength(0);
  });
});
