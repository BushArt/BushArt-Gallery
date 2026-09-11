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

vi.mock("@/lib/cloudinary/transformations", () => ({
  getTransformationUrl: vi.fn(
    (publicId: string, context: string, resourceType: string) =>
      `https://res.cloudinary.com/test-cloud/${resourceType}/upload/${context}/${publicId}`,
  ),
}));

import { GET } from "@/app/api/artworks/[id]/download/route";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";

describe("GET /api/artworks/:slug/download", () => {
  beforeEach(async () => {
    await clearCollections(["artworks", "tags"]);

    const db = await getTestDb();
    await db.collection("artworks").insertOne({
      _id: new ObjectId("65a1f2b3c4d5e6f7a8b9c0d1"),
      slug: "moth-study",
      title: "Moth Study",
      description: null,
      medium: "Gouache",
      type: "personal",
      nsfw: false,
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
        {
          publicId: "bushart/artworks/moth/detail",
          url: "https://example.com/detail.jpg",
          width: 100,
          height: 100,
          order: 1,
        },
      ],
      timelapse: {
        publicId: "bushart/artworks/moth/timelapse",
        url: "https://example.com/timelapse.mp4",
        durationSeconds: 30,
        width: 1920,
        height: 1080,
      },
      tagIds: [],
      completionDate: new Date("2026-06-30T00:00:00.000Z"),
      colorPalette: null,
      createdAt: new Date("2026-06-30T00:00:00.000Z"),
      updatedAt: new Date("2026-06-30T00:00:00.000Z"),
    });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("302 redirects to fl_attachment URL for primary image", async () => {
    const req = new NextRequest(
      "http://localhost/api/artworks/moth-study/download",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    expect(res.status).toBe(302);
    expect(getTransformationUrl).toHaveBeenCalledWith(
      "bushart/artworks/moth/main",
      "download",
      "image",
    );
    expect(res.headers.get("location")).toContain(
      "bushart/artworks/moth/main",
    );
  });

  it("redirects to requested image index", async () => {
    const req = new NextRequest(
      "http://localhost/api/artworks/moth-study/download?image=1",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    expect(res.status).toBe(302);
    expect(getTransformationUrl).toHaveBeenCalledWith(
      "bushart/artworks/moth/detail",
      "download",
      "image",
    );
  });

  it("redirects to timelapse video download", async () => {
    const req = new NextRequest(
      "http://localhost/api/artworks/moth-study/download?asset=timelapse",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    expect(res.status).toBe(302);
    expect(getTransformationUrl).toHaveBeenCalledWith(
      "bushart/artworks/moth/timelapse",
      "download",
      "video",
    );
  });

  it("returns 404 when artwork not found", async () => {
    const req = new NextRequest(
      "http://localhost/api/artworks/missing/download",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when timelapse requested but absent", async () => {
    const db = await getTestDb();
    await db.collection("artworks").updateOne(
      { slug: "moth-study" },
      { $set: { timelapse: null } },
    );

    const req = new NextRequest(
      "http://localhost/api/artworks/moth-study/download?asset=timelapse",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when image index is out of range", async () => {
    const req = new NextRequest(
      "http://localhost/api/artworks/moth-study/download?image=99",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 VALIDATION_ERROR for invalid query parameters", async () => {
    const req = new NextRequest(
      "http://localhost/api/artworks/moth-study/download?image=abc",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("uses sorted order when images array is unsorted in MongoDB", async () => {
    const db = await getTestDb();
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
              order: 1,
            },
            {
              publicId: "bushart/artworks/moth/main",
              url: "https://example.com/main.jpg",
              width: 100,
              height: 100,
              order: 0,
            },
          ],
        },
      },
    );

    const req = new NextRequest(
      "http://localhost/api/artworks/moth-study/download?image=1",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "moth-study" }),
    });
    expect(res.status).toBe(302);
    expect(getTransformationUrl).toHaveBeenCalledWith(
      "bushart/artworks/moth/detail",
      "download",
      "image",
    );
  });
});
