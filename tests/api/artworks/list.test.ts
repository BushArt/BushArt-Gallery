import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import {
  getTestDb,
  clearCollections,
  seedDocuments,
  closeTestDb,
  createMongodbMock,
} from "../../helpers";

// Mock the mongodb module to redirect to test database
vi.mock("@/lib/db/mongodb", () => createMongodbMock());

import { GET } from "@/app/api/artworks/route";

async function seedTestData() {
  const db = await getTestDb();
  const tagId = new ObjectId("65a1f2b3c4d5e6f7a8b9c0d2");
  const tagId2 = new ObjectId("65a1f2b3c4d5e6f7a8b9c0d3");

  // Seed tags
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
      name: "Insects",
      slug: "insects",
      usageCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ]);

  // Seed artworks
  await db.collection("artworks").insertMany([
    {
      slug: "moth-study",
      title: "Moth Study",
      description: "A detailed gouache painting of a moth",
      medium: "Gouache",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [
        {
          publicId: "bushart/artworks/moth/main",
          url: "https://example.com/moth.jpg",
          width: 100,
          height: 100,
          order: 0,
        },
      ],
      timelapse: null,
      tagIds: [tagId, tagId2],
      completionDate: new Date("2026-06-30T00:00:00.000Z"),
      colorPalette: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    },
    {
      slug: "beetle-study",
      title: "Beetle Study",
      description: "A study of beetles",
      medium: "Digital",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [
        {
          publicId: "bushart/artworks/beetle/main",
          url: "https://example.com/beetle.jpg",
          width: 100,
          height: 100,
          order: 0,
        },
      ],
      timelapse: null,
      tagIds: [tagId2],
      completionDate: new Date("2026-05-15T00:00:00.000Z"),
      colorPalette: null,
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  ]);

  return { tagId, tagId2 };
}

function listRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/artworks${query}`);
}

describe("GET /api/artworks", () => {
  beforeEach(async () => {
    await clearCollections(["artworks", "tags"]);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns paginated feed with default params", async () => {
    await seedTestData();

    const res = await GET(listRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(json.hasMore).toBe(false);
  });

  it("returns 400 for an invalid pagination cursor", async () => {
    const res = await GET(listRequest("?cursor=not-a-valid-cursor!!!"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toBe("Invalid cursor");
  });

  it("returns items sorted by most recent first", async () => {
    await seedTestData();

    const res = await GET(listRequest());
    const json = await res.json();
    expect(json.items[0].title).toBe("Moth Study");
    expect(json.items[1].title).toBe("Beetle Study");
  });

  it("filters by tag slug", async () => {
    await seedTestData();

    const res = await GET(listRequest("?tags=insects"));
    const json = await res.json();
    expect(json.items).toHaveLength(2);
  });

  it("filters by single tag", async () => {
    await seedTestData();

    const res = await GET(listRequest("?tags=gouache"));
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].title).toBe("Moth Study");
  });

  it("returns 400 VALIDATION_ERROR for invalid limit", async () => {
    const res = await GET(listRequest("?limit=100"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR for invalid type", async () => {
    const res = await GET(listRequest("?type=invalid"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("defaults nsfw to exclude per spec", async () => {
    const db = await getTestDb();
    const tagId = new ObjectId("65a1f2b3c4d5e6f7a8b9c0d2");

    await db.collection("tags").insertOne({
      _id: tagId,
      name: "Test",
      slug: "test",
      usageCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await db.collection("artworks").insertMany([
      {
        slug: "safe-art",
        title: "Safe Art",
        description: null,
        medium: "Digital",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [
          {
            publicId: "bushart/test/safe",
            url: "https://example.com/safe.jpg",
            width: 100,
            height: 100,
            order: 0,
          },
        ],
        timelapse: null,
        tagIds: [tagId],
        completionDate: new Date("2026-06-30T00:00:00.000Z"),
        colorPalette: null,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      {
        slug: "nsfw-art",
        title: "NSFW Art",
        description: null,
        medium: "Digital",
        type: "personal",
        nsfw: true,
        featured: false,
        featuredOrder: null,
        images: [
          {
            publicId: "bushart/test/nsfw",
            url: "https://example.com/nsfw.jpg",
            width: 100,
            height: 100,
            order: 0,
          },
        ],
        timelapse: null,
        tagIds: [tagId],
        completionDate: new Date("2026-06-15T00:00:00.000Z"),
        colorPalette: null,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);

    const res = await GET(listRequest());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(1);
    expect(json.items[0].title).toBe("Safe Art");
  });

  it("includes NSFW artworks when nsfw=include", async () => {
    const db = await getTestDb();
    const tagId = new ObjectId("65a1f2b3c4d5e6f7a8b9c0d2");

    await db.collection("tags").insertOne({
      _id: tagId,
      name: "Test",
      slug: "test",
      usageCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await db.collection("artworks").insertMany([
      {
        slug: "safe-art",
        title: "Safe Art",
        description: null,
        medium: "Digital",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [
          {
            publicId: "bushart/test/safe",
            url: "https://example.com/safe.jpg",
            width: 100,
            height: 100,
            order: 0,
          },
        ],
        timelapse: null,
        tagIds: [tagId],
        completionDate: new Date("2026-06-30T00:00:00.000Z"),
        colorPalette: null,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      {
        slug: "nsfw-art",
        title: "NSFW Art",
        description: null,
        medium: "Digital",
        type: "personal",
        nsfw: true,
        featured: false,
        featuredOrder: null,
        images: [
          {
            publicId: "bushart/test/nsfw",
            url: "https://example.com/nsfw.jpg",
            width: 100,
            height: 100,
            order: 0,
          },
        ],
        timelapse: null,
        tagIds: [tagId],
        completionDate: new Date("2026-06-15T00:00:00.000Z"),
        colorPalette: null,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);

    const res = await GET(listRequest("?nsfw=include"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(2);
  });

  it("filters by year", async () => {
    await seedTestData();

    const res = await GET(listRequest("?year=2026"));
    const json = await res.json();
    expect(json.items).toHaveLength(2);
  });

  it("returns empty array when no artworks match", async () => {
    const res = await GET(listRequest("?tags=nonexistent"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(0);
    expect(json.hasMore).toBe(false);
  });
});
