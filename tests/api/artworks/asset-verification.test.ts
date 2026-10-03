import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin1", username: "bush" })),
}));

const createArtwork = vi.fn();
const updateArtwork = vi.fn();
const findArtworkById = vi.fn();

vi.mock("@/lib/db/models/artwork", () => ({
  createArtwork: (...args: unknown[]) => createArtwork(...args),
  updateArtwork: (...args: unknown[]) => updateArtwork(...args),
  findArtworkById: (...args: unknown[]) => findArtworkById(...args),
}));

vi.mock("@/lib/db/models/tag", () => ({
  findMissingTagIds: vi.fn(async () => []),
  findTagsByIds: vi.fn(async () => []),
}));

const verifyAssetOwnershipAll = vi.fn();

vi.mock("@/lib/cloudinary/verify", () => ({
  verifyAssetOwnershipAll: (...args: unknown[]) => verifyAssetOwnershipAll(...args),
  describeAssetRejections: (rejected: Array<{ publicId: string; reason: string }>) => ({
    missing: rejected.filter((r) => r.reason === "missing").map((r) => r.publicId),
    foreign: rejected.filter((r) => r.reason === "foreign").map((r) => r.publicId),
  }),
}));

vi.mock("@/lib/api/artwork-slug", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/artwork-slug")>(
    "@/lib/api/artwork-slug",
  );
  return { ...actual, generateUniqueArtworkSlug: vi.fn(async () => "moth-study") };
});

import { POST } from "@/app/api/artworks/route";
import { PATCH } from "@/app/api/artworks/[id]/route";
import { createJsonRequest } from "../../helpers";

const validImage = {
  publicId: "bushart/uploads/a1b2",
  url: "https://res.cloudinary.com/test/image/upload/a1b2",
  width: 100,
  height: 100,
  order: 0,
};

const validTimelapse = {
  publicId: "bushart/uploads/clip",
  url: "https://res.cloudinary.com/test/video/upload/clip",
  durationSeconds: 12,
  width: 1920,
  height: 1080,
};

function body(overrides: Record<string, unknown> = {}) {
  return {
    title: "Moth Study",
    description: null,
    medium: "Gouache",
    type: "personal" as const,
    nsfw: false,
    completionDate: "2026-06-30",
    tagIds: [],
    images: [validImage],
    ...overrides,
  };
}

function acceptAllAssets() {
  verifyAssetOwnershipAll.mockResolvedValue({
    ok: true,
    verified: [{ publicId: "bushart/uploads/a1b2", resourceType: "image" }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  acceptAllAssets();
  createArtwork.mockResolvedValue({
    id: "65a1f2b3c4d5e6f7a8b9c0d1",
    slug: "moth-study",
    title: "Moth Study",
    description: null,
    medium: "Gouache",
    type: "personal",
    nsfw: false,
    featured: false,
    featuredOrder: null,
    images: [validImage],
    timelapse: null,
    tagIds: [],
    completionDate: "2026-06-30T00:00:00.000Z",
    colorPalette: null,
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  });
});

describe("POST /api/artworks — Cloudinary asset verification", () => {
  it("verifies every referenced asset before persisting", async () => {
    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", body()),
    );

    expect(res.status).toBe(201);
    expect(verifyAssetOwnershipAll).toHaveBeenCalledWith([
      { publicId: "bushart/uploads/a1b2", resourceType: "image" },
    ]);
  });

  it("includes the timelapse as a video resource in the verification set", async () => {
    await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", body({ timelapse: validTimelapse })),
    );

    expect(verifyAssetOwnershipAll).toHaveBeenCalledWith([
      { publicId: "bushart/uploads/a1b2", resourceType: "image" },
      { publicId: "bushart/uploads/clip", resourceType: "video" },
    ]);
  });

  // Validation passes on shape alone, so this is the layer that proves the
  // asset was really uploaded to this cloud.
  it("returns 400 when an asset cannot be verified, and does not persist", async () => {
    verifyAssetOwnershipAll.mockResolvedValue({
      ok: false,
      rejected: [{ publicId: "bushart/uploads/ghost", resourceType: "image", reason: "missing" }],
    });

    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", body()),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.missing).toEqual(["bushart/uploads/ghost"]);
    expect(createArtwork).not.toHaveBeenCalled();
  });

  it("returns 400 for an asset outside the bushart/ namespace", async () => {
    verifyAssetOwnershipAll.mockResolvedValue({
      ok: false,
      rejected: [{ publicId: "other-tenant/x", resourceType: "image", reason: "foreign" }],
    });

    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", body()),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error.details.foreign).toEqual(["other-tenant/x"]);
    expect(createArtwork).not.toHaveBeenCalled();
  });
});

describe("POST /api/artworks — duplicate slug retry", () => {
  it("retries with a new slug on duplicate key instead of returning 500", async () => {
    createArtwork
      .mockRejectedValueOnce(Object.assign(new Error("E11000"), { code: 11000 }))
      .mockResolvedValueOnce({
        id: "65a1f2b3c4d5e6f7a8b9c0d2",
        slug: "moth-study",
        title: "Moth Study",
        description: null,
        medium: "Gouache",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [validImage],
        timelapse: null,
        tagIds: [],
        completionDate: "2026-06-30T00:00:00.000Z",
        colorPalette: null,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      });

    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", body()),
    );

    expect(res.status).toBe(201);
    expect(createArtwork).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry bound rather than looping", async () => {
    createArtwork.mockRejectedValue(Object.assign(new Error("E11000"), { code: 11000 }));

    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", body()),
    );

    expect(res.status).toBe(500);
    // 1 initial attempt + 2 retries.
    expect(createArtwork).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-duplicate-key failure", async () => {
    createArtwork.mockRejectedValue(new Error("disk on fire"));

    const res = await POST(
      createJsonRequest("POST", "http://localhost/api/artworks", body()),
    );

    expect(res.status).toBe(500);
    expect(createArtwork).toHaveBeenCalledTimes(1);
  });

  // The assets do not change across slug retries, so re-verifying them would
  // multiply Admin API calls for no new information.
  it("verifies assets once, not once per retry", async () => {
    createArtwork
      .mockRejectedValueOnce(Object.assign(new Error("E11000"), { code: 11000 }))
      .mockResolvedValueOnce({
        id: "65a1f2b3c4d5e6f7a8b9c0d2",
        slug: "moth-study",
        title: "Moth Study",
        description: null,
        medium: "Gouache",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [validImage],
        timelapse: null,
        tagIds: [],
        completionDate: "2026-06-30T00:00:00.000Z",
        colorPalette: null,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      });

    await POST(createJsonRequest("POST", "http://localhost/api/artworks", body()));

    expect(verifyAssetOwnershipAll).toHaveBeenCalledTimes(1);
  });
});

describe("PATCH /api/artworks/:id — Cloudinary asset verification", () => {
  const artworkId = "65a1f2b3c4d5e6f7a8b9c0d1";

  beforeEach(() => {
    findArtworkById.mockResolvedValue({
      id: artworkId,
      slug: "moth-study",
      title: "Moth Study",
      description: null,
      medium: "Gouache",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [validImage],
      timelapse: null,
      tagIds: [],
      completionDate: "2026-06-30T00:00:00.000Z",
      colorPalette: null,
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
    });
    updateArtwork.mockResolvedValue({
      id: artworkId,
      slug: "moth-study",
      title: "Moth Study",
      description: null,
      medium: "Gouache",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [validImage],
      timelapse: null,
      tagIds: [],
      completionDate: "2026-06-30T00:00:00.000Z",
      colorPalette: null,
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
    });
  });

  it("verifies new images before applying the patch", async () => {
    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, {
        images: [validImage],
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(res.status).toBe(200);
    expect(verifyAssetOwnershipAll).toHaveBeenCalledWith([
      { publicId: "bushart/uploads/a1b2", resourceType: "image" },
    ]);
  });

  it("returns 400 and does not update when a patched asset is unverifiable", async () => {
    verifyAssetOwnershipAll.mockResolvedValue({
      ok: false,
      rejected: [{ publicId: "bushart/uploads/ghost", resourceType: "image", reason: "missing" }],
    });

    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, {
        images: [validImage],
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(res.status).toBe(400);
    expect(updateArtwork).not.toHaveBeenCalled();
  });

  // A patch that only renames must not spend an Admin API call re-verifying
  // assets that were verified when they were first written.
  it("skips verification for a patch that touches no media", async () => {
    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, {
        title: "Renamed",
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(res.status).toBe(200);
    expect(verifyAssetOwnershipAll).not.toHaveBeenCalled();
  });

  // timelapse: null removes the video; there is no new publicId to verify.
  it("skips verification when the patch only removes the timelapse", async () => {
    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, {
        timelapse: null,
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(res.status).toBe(200);
    expect(verifyAssetOwnershipAll).not.toHaveBeenCalled();
  });

  it("verifies a newly attached timelapse as a video", async () => {
    await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, {
        timelapse: validTimelapse,
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(verifyAssetOwnershipAll).toHaveBeenCalledWith([
      { publicId: "bushart/uploads/clip", resourceType: "video" },
    ]);
  });

  it("returns 400 for a non-ObjectId id before verifying anything", async () => {
    const res = await PATCH(
      createJsonRequest("PATCH", "http://localhost/api/artworks/not-an-id", {
        images: [validImage],
      }),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );

    expect(res.status).toBe(400);
    expect(verifyAssetOwnershipAll).not.toHaveBeenCalled();
  });

  it("returns 401 without verifying when unauthenticated", async () => {
    const guard = await import("@/lib/auth/guard");
    vi.mocked(guard.requireAdmin).mockRejectedValueOnce(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), { status: 401 }),
    );

    const res = await PATCH(
      createJsonRequest("PATCH", `http://localhost/api/artworks/${artworkId}`, {
        images: [validImage],
      }),
      { params: Promise.resolve({ id: artworkId }) },
    );

    expect(res.status).toBe(401);
    expect(verifyAssetOwnershipAll).not.toHaveBeenCalled();
  });
});