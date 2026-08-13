import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  artworkId,
  tagA,
  tagB,
  validImage,
  createJsonRequest,
} from "../../helpers";

vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db/models/artwork", () => ({
  createArtwork: vi.fn(),
  updateArtwork: vi.fn(),
  deleteArtwork: vi.fn(),
  findArtworkById: vi.fn(),
  findArtworkBySlug: vi.fn(),
}));

vi.mock("@/lib/db/models/tag", () => ({
  findMissingTagIds: vi.fn(),
  findTagsByIds: vi.fn(),
}));

vi.mock("@/lib/api/artwork-slug", () => ({
  generateUniqueArtworkSlug: vi.fn(async () => "moth-study"),
}));

vi.mock("@/lib/cloudinary/destroy", () => ({
  destroyAssets: vi.fn(),
}));

import { POST } from "@/app/api/artworks/route";
import { PATCH, DELETE } from "@/app/api/artworks/[id]/route";
import { requireAdmin } from "@/lib/auth/guard";
import {
  createArtwork,
  updateArtwork,
  deleteArtwork,
  findArtworkById,
} from "@/lib/db/models/artwork";
import { findMissingTagIds, findTagsByIds } from "@/lib/db/models/tag";
import { destroyAssets } from "@/lib/cloudinary/destroy";

const baseArtwork = {
  id: artworkId,
  slug: "moth-study",
  title: "Moth Study",
  description: "Desc",
  medium: "Gouache",
  type: "personal" as const,
  nsfw: false,
  featured: false,
  featuredOrder: null,
  images: [validImage],
  timelapse: null,
  tagIds: [tagA],
  completionDate: "2026-06-30T00:00:00.000Z",
  colorPalette: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("POST /api/artworks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
    vi.mocked(findMissingTagIds).mockResolvedValue([]);
    vi.mocked(createArtwork).mockResolvedValue(baseArtwork);
    vi.mocked(findTagsByIds).mockResolvedValue([
      { id: tagA, name: "Gouache", slug: "gouache", usageCount: 1, createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), { status: 401 }),
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
    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", {
        title: "Moth Study",
        medium: "Gouache",
        type: "personal",
        nsfw: false,
        completionDate: "2026-06-30",
        tagIds: [tagA],
        images: [validImage],
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.slug).toBe("moth-study");
    expect(json.tags).toHaveLength(1);
  });

  it("returns 400 when tagIds reference missing tags", async () => {
    vi.mocked(findMissingTagIds).mockResolvedValue(["deadbeefdeadbeefdeadbeef"]);
    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", {
        title: "Moth Study",
        medium: "Gouache",
        type: "personal",
        nsfw: false,
        completionDate: "2026-06-30",
        tagIds: ["deadbeefdeadbeefdeadbeef"],
        images: [validImage],
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /api/artworks/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
    vi.mocked(findArtworkById).mockResolvedValue(baseArtwork);
    vi.mocked(findMissingTagIds).mockResolvedValue([]);
    vi.mocked(updateArtwork).mockResolvedValue({ ...baseArtwork, tagIds: [tagB] });
    vi.mocked(findTagsByIds).mockResolvedValue([
      { id: tagB, name: "Insects", slug: "insects", usageCount: 2, createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), { status: 401 }),
    );
    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, { title: "New" }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 VALIDATION_ERROR for invalid JSON body", async () => {
    const req = new NextRequest(`http://localhost/api/artworks/${artworkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: artworkId }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for non-ObjectId id param", async () => {
    const res = await PATCH(
      createJsonRequest("PATCH", "http://localhost/api/artworks/not-an-id", { title: "New" }),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when featured true without featuredOrder", async () => {
    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, { featured: true }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain("featuredOrder");
    expect(updateArtwork).not.toHaveBeenCalled();
  });

  it("forwards tagIds to updateArtwork", async () => {
    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, { tagIds: [tagB] }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(200);
    expect(updateArtwork).toHaveBeenCalledWith(
      artworkId,
      expect.objectContaining({ tagIds: [tagB] }),
    );
  });

  it("returns 404 when artwork not found", async () => {
    vi.mocked(findArtworkById).mockResolvedValue(null);
    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, { title: "New" }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/artworks/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
    vi.mocked(findArtworkById).mockResolvedValue(baseArtwork);
    vi.mocked(deleteArtwork).mockResolvedValue({ tagIds: [tagA] });
    vi.mocked(destroyAssets).mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), { status: 401 }),
    );
    const res = await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(401);
  });

  it("destroys Cloudinary assets before deleting artwork", async () => {
    const res = await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(200);
    expect(destroyAssets).toHaveBeenCalled();
    expect(deleteArtwork).toHaveBeenCalledWith(artworkId);
    const destroyOrder = vi.mocked(destroyAssets).mock.invocationCallOrder[0];
    const deleteOrder = vi.mocked(deleteArtwork).mock.invocationCallOrder[0];
    expect(destroyOrder).toBeLessThan(deleteOrder);
  });

  it("destroys image and timelapse assets when present", async () => {
    vi.mocked(findArtworkById).mockResolvedValue({
      ...baseArtwork,
      timelapse: {
        publicId: "bushart/artworks/moth/timelapse",
        url: "https://example.com/timelapse.mp4",
        durationSeconds: 30,
        width: 1920,
        height: 1080,
      },
    });

    await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(destroyAssets).toHaveBeenCalledWith([
      { publicId: validImage.publicId, resourceType: "image" },
      { publicId: "bushart/artworks/moth/timelapse", resourceType: "video" },
    ]);
  });

  it("returns 503 and does not delete artwork when Cloudinary destroy fails", async () => {
    vi.mocked(destroyAssets).mockRejectedValue(new Error("Cloudinary down"));

    const res = await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(deleteArtwork).not.toHaveBeenCalled();
  });

  it("returns 404 when artwork not found", async () => {
    vi.mocked(findArtworkById).mockResolvedValue(null);
    const res = await DELETE(
      new NextRequest(`http://localhost/api/artworks/${artworkId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: artworkId }) },
    );
    expect(res.status).toBe(404);
  });
});
