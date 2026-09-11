import { describe, it, expect, beforeEach, afterAll } from "vitest";
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

import { GET } from "@/app/api/artworks/[id]/route";

describe("GET /api/artworks/:slug", () => {
  beforeEach(async () => {
    await clearCollections(["artworks", "tags"]);

    const db = await getTestDb();
    const tagId = new ObjectId("65a1e0a0c4d5e6f7a8b9c0aa");

    await db.collection("tags").insertOne({
      _id: tagId,
      name: "Gouache",
      slug: "gouache",
      usageCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await db.collection("artworks").insertOne({
      _id: new ObjectId("65a1f2b3c4d5e6f7a8b9c0d1"),
      slug: "moth-study",
      title: "Moth Study",
      description: "A study",
      medium: "Gouache",
      type: "personal",
      nsfw: true,
      featured: false,
      featuredOrder: null,
      images: [
        {
          publicId: "bushart/artworks/moth/main",
          url: "https://example.com/main.jpg",
          width: 100,
          height: 100,
          order: 0,
        },
      ],
      timelapse: null,
      tagIds: [tagId],
      completionDate: new Date("2026-06-30T00:00:00.000Z"),
      colorPalette: null,
      createdAt: new Date("2026-06-30T00:00:00.000Z"),
      updatedAt: new Date("2026-06-30T00:00:00.000Z"),
    });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns full detail including NSFW artwork", async () => {
    const req = new NextRequest("http://localhost/api/artworks/moth-study");
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slug).toBe("moth-study");
    expect(json.nsfw).toBe(true);
    expect(json.tags).toEqual([
      { id: "65a1e0a0c4d5e6f7a8b9c0aa", name: "Gouache", slug: "gouache" },
    ]);
  });

  it("returns 404 when slug does not exist", async () => {
    const req = new NextRequest("http://localhost/api/artworks/missing");
    const res = await GET(req, {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns images sorted by order ascending", async () => {
    const db = await getTestDb();
    const tagId = new ObjectId("65a1e0a0c4d5e6f7a8b9c0aa");

    await db.collection("artworks").updateOne(
      { slug: "moth-study" },
      {
        $set: {
          images: [
            {
              publicId: "bushart/artworks/moth/detail",
              url: "https://example.com/detail.jpg",
              width: 100,
              height: 100,
              order: 2,
            },
            {
              publicId: "bushart/artworks/moth/main",
              url: "https://example.com/main.jpg",
              width: 100,
              height: 100,
              order: 0,
            },
            {
              publicId: "bushart/artworks/moth/mid",
              url: "https://example.com/mid.jpg",
              width: 100,
              height: 100,
              order: 1,
            },
          ],
        },
      },
    );

    const req = new NextRequest("http://localhost/api/artworks/moth-study");
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    const json = await res.json();
    expect(json.images.map((img: { order: number }) => img.order)).toEqual([
      0, 1, 2,
    ]);
  });
});
