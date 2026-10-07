import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guard", () => ({
  isAdminRequest: vi.fn(),
}));

const findArtworkPreview = vi.fn();

vi.mock("@/lib/db/models/artwork", () => ({
  findArtworkPreview: (...args: unknown[]) => findArtworkPreview(...args),
}));

import { GET } from "@/app/api/artworks/[id]/preview/route";
import { isAdminRequest } from "@/lib/auth/guard";

const mockIsAdminRequest = vi.mocked(isAdminRequest);
const mockPreview = vi.mocked(findArtworkPreview);

function params(slug: string) {
  return { params: Promise.resolve({ id: slug }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAdminRequest.mockResolvedValue(false);
  mockPreview.mockResolvedValue(null);
});

describe("GET /api/artworks/:slug/preview", () => {
  it("returns 404 when the slug does not resolve", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/artworks/missing/preview"),
      params("missing"),
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  // The response varies by admin session (NSFW visibility), so a shared cache
  // must never store it.
  it("marks the response private so a shared cache cannot vary by session", async () => {
    mockPreview.mockResolvedValue({
      slug: "moth-study",
      title: "Moth Study",
      nsfw: false,
      coverImage: { publicId: "bushart/uploads/cover", width: 10, height: 10 },
      descriptionPreview: null,
    });

    const res = await GET(
      new NextRequest("http://localhost/api/artworks/moth-study/preview"),
      params("moth-study"),
    );

    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("looks up the preview without NSFW for an unauthenticated caller", async () => {
    await GET(
      new NextRequest("http://localhost/api/artworks/moth-study/preview"),
      params("moth-study"),
    );

    expect(mockPreview).toHaveBeenCalledWith("moth-study", false);
  });

  it("includes NSFW in the lookup for an authenticated admin", async () => {
    mockIsAdminRequest.mockResolvedValue(true);
    mockPreview.mockResolvedValue({
      slug: "moth-study",
      title: "Moth Study",
      nsfw: true,
      coverImage: { publicId: "bushart/uploads/cover", width: 10, height: 10 },
      descriptionPreview: null,
    });

    const res = await GET(
      new NextRequest("http://localhost/api/artworks/moth-study/preview"),
      params("moth-study"),
    );

    expect(mockPreview).toHaveBeenCalledWith("moth-study", true);
    expect(res.status).toBe(200);
    expect((await res.json()).nsfw).toBe(true);
  });

  it("returns only the preview fields, never the full detail document", async () => {
    mockPreview.mockResolvedValue({
      slug: "moth-study",
      title: "Moth Study",
      nsfw: false,
      coverImage: { publicId: "bushart/uploads/cover", width: 10, height: 10 },
      descriptionPreview: "A study",
    });

    const res = await GET(
      new NextRequest("http://localhost/api/artworks/moth-study/preview"),
      params("moth-study"),
    );

    expect(Object.keys(await res.json()).sort()).toEqual([
      "coverImage",
      "descriptionPreview",
      "nsfw",
      "slug",
      "title",
    ]);
  });
});