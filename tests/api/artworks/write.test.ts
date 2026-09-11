import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import {
  validImage,
  createJsonRequest,
  getTestDb,
  clearCollections,
  seedDocument,
  closeTestDb,
  createMongodbMock,
} from "../../helpers";

// Mock the mongodb module to redirect to test database
vi.mock("@/lib/db/mongodb", () => createMongodbMock());

// Mock auth guard — these are admin-gated routes
vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(),
}));

// Mock Cloudinary destroy
vi.mock("@/lib/cloudinary/destroy", () => ({
  destroyAssets: vi.fn(async () => undefined),
}));

// Mock slug generation for deterministic tests
vi.mock("@/lib/api/artwork-slug", () => ({
  generateUniqueArtworkSlug: vi.fn(async (title: string) =>
    title.toLowerCase().replace(/\s+/g, "-"),
  ),
}));

import { POST } from "@/app/api/artworks/route";
import { PATCH, DELETE } from "@/app/api/artworks/[id]/route";
import { requireAdmin } from "@/lib/auth/guard";
import { destroyAssets } from "@/lib/cloudinary/destroy";

async function seedTags() {
  const db = await getTestDb();
  const tagId = new ObjectId("65a1e0a0c4d5e6f7a8b9c0aa");
  const tagId2 = new ObjectId("65a1e0a0c4d5e6f7a8b9c0ab");

  await db.collection("tags").insertMany([
    {
      _id: tagId,
      name: "Gouache",
      slug: "gouache",
      usageCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      _id: tagId2,
      name: "Digital",
      slug: "digital",
      usageCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ]);

  return { tagId, tagId2 };
}

describe("POST /api/artworks", () => {
  beforeEach(async () => {
    await clearCollections(["artworks", "tags"]);
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
    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", {
        title: "T",
        medium: "M",
        type: "personal",
        nsfw: false,
        completionDate: "2026-06-30",
        tagIds: [],
        images: [validImage],
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 VALIDATION_ERROR for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/artworks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for malformed tagIds", async () => {
    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", {
        title: "Moth Study",
        medium: "Gouache",
        type: "personal",
        nsfw: false,
        completionDate: "2026-06-30",
        tagIds: ["not-an-object-id"],
        images: [validImage],
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 201 with detail shape on success", async () => {
    const { tagId } = await seedTags();

    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", {
        title: "Moth Study",
        medium: "Gouache",
        type: "personal",
        nsfw: false,
        completionDate: "2026-06-30",
        tagIds: [tagId.toHexString()],
        images: [validImage],
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.slug).toBe("moth-study");
    expect(json.title).toBe("Moth Study");
    expect(json.medium).toBe("Gouache");
    expect(json.type).toBe("personal");
    expect(json.nsfw).toBe(false);
    expect(json.images).toHaveLength(1);
    expect(json.tags).toEqual([
      expect.objectContaining({ slug: "gouache" }),
    ]);
  });

  it("returns 400 when tagIds reference non-existent tags", async () => {
    const fakeTagId = new ObjectId().toHexString();
    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", {
        title: "Moth Study",
        medium: "Gouache",
        type: "personal",
        nsfw: false,
        completionDate: "2026-06-30",
        tagIds: [fakeTagId],
        images: [validImage],
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("persists the artwork to the database", async () => {
    const { tagId } = await seedTags();

    await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", {
        title: "Persisted Art",
        medium: "Digital",
        type: "personal",
        nsfw: false,
        completionDate: "2026-07-01",
        tagIds: [tagId.toHexString()],
        images: [validImage],
      }),
    );

    const db = await getTestDb();
    const saved = await db
      .collection("artworks")
      .findOne({ slug: "persisted-art" });
    expect(saved).toBeTruthy();
    expect(saved?.title).toBe("Persisted Art");
  });
});

describe("PATCH /api/artworks/:id", () => {
  let artworkId: string;

  beforeEach(async () => {
    await clearCollections(["artworks", "tags"]);
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });

    const { tagId } = await seedTags();
    const db = await getTestDb();
    const result = await db.collection("artworks").insertOne({
      slug: "existing-art",
      title: "Existing Art",
      description: "Original description",
      medium: "Digital",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [validImage],
      timelapse: null,
      tagIds: [tagId],
      completionDate: new Date("2026-06-01T00:00:00.000Z"),
      colorPalette: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    artworkId = result.insertedId.toHexString();
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
    const res = await PATCH(
      createJsonRequest(
        "PATCH",
        `http://localhost/api/artworks/${artworkId}`,
        { title: "Updated" },
      ),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when artwork not found", async () => {
    const fakeId = new ObjectId().toHexString();
    const res = await PATCH(
      createJsonRequest(
        "PATCH",
        `http://localhost/api/artworks/${fakeId}`,
        { title: "Updated" },
      ),
      { params: Promise.resolve({ id: fakeId }) },
    );
    expect(res.status).toBe(404);
  });

  it("updates the artwork and returns 200", async () => {
    const res = await PATCH(
      createJsonRequest(
        "PATCH",
        `http://localhost/api/artworks/${artworkId}`,
        { title: "Updated Art", medium: "Gouache" },
      ),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe("Updated Art");
    expect(json.medium).toBe("Gouache");
  });

  it("persists the update to the database", async () => {
    await PATCH(
      createJsonRequest(
        "PATCH",
        `http://localhost/api/artworks/${artworkId}`,
        { description: "New description" },
      ),
      { params: Promise.resolve({ id: artworkId }) },
    );

    const db = await getTestDb();
    const updated = await db
      .collection("artworks")
      .findOne({ _id: new ObjectId(artworkId) });
    expect(updated?.description).toBe("New description");
  });

  it("returns 400 for non-ObjectId id param", async () => {
    const res = await PATCH(
      createJsonRequest(
        "PATCH",
        "http://localhost/api/artworks/not-an-id",
        { title: "Updated" },
      ),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/artworks/:id", () => {
  let artworkId: string;

  beforeEach(async () => {
    await clearCollections(["artworks", "tags"]);
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });
    vi.mocked(destroyAssets).mockResolvedValue(undefined);

    const { tagId } = await seedTags();
    const db = await getTestDb();
    const result = await db.collection("artworks").insertOne({
      slug: "delete-me",
      title: "Delete Me",
      description: "To be deleted",
      medium: "Digital",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [validImage],
      timelapse: null,
      tagIds: [tagId],
      completionDate: new Date("2026-06-01T00:00:00.000Z"),
      colorPalette: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    artworkId = result.insertedId.toHexString();
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
    const res = await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(401);
  });

  it("destroys Cloudinary assets before deleting artwork", async () => {
    const res = await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(200);
    expect(destroyAssets).toHaveBeenCalled();
  });

  it("destroys image and timelapse assets when present", async () => {
    const db = await getTestDb();
    await db.collection("artworks").updateOne(
      { _id: new ObjectId(artworkId) },
      {
        $set: {
          timelapse: {
            publicId: "bushart/artworks/moth/timelapse",
            url: "https://example.com/timelapse.mp4",
            durationSeconds: 30,
            width: 1920,
            height: 1080,
          },
        },
      },
    );

    await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(destroyAssets).toHaveBeenCalledWith([
      { publicId: validImage.publicId, resourceType: "image" },
      {
        publicId: "bushart/artworks/moth/timelapse",
        resourceType: "video",
      },
    ]);
  });

  it("returns 503 and does not delete artwork when Cloudinary destroy fails", async () => {
    vi.mocked(destroyAssets).mockRejectedValue(new Error("Cloudinary down"));

    const res = await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("SERVICE_UNAVAILABLE");

    // Verify artwork was NOT deleted
    const db = await getTestDb();
    const stillExists = await db
      .collection("artworks")
      .findOne({ _id: new ObjectId(artworkId) });
    expect(stillExists).toBeTruthy();
  });

  it("returns 404 when artwork not found", async () => {
    const fakeId = new ObjectId().toHexString();
    const res = await DELETE(
      new NextRequest(`http://localhost/api/artworks/${fakeId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: fakeId }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for non-ObjectId id param", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/artworks/not-an-id", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );
    expect(res.status).toBe(400);
  });

  it("removes the artwork from the database", async () => {
    await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    const db = await getTestDb();
    const deleted = await db
      .collection("artworks")
      .findOne({ _id: new ObjectId(artworkId) });
    expect(deleted).toBeNull();
  });
});
