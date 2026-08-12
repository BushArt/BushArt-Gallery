import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/models/artwork", () => ({
  findArtworkBySlug: vi.fn(),
}));

vi.mock("@/lib/db/models/tag", () => ({
  findTagsByIds: vi.fn(),
}));

import { GET } from "@/app/api/artworks/[id]/route";
import { findArtworkBySlug } from "@/lib/db/models/artwork";
import { findTagsByIds } from "@/lib/db/models/tag";

const artwork = {
  id: "65a1f2b3c4d5e6f7a8b9c0d1",
  slug: "moth-study",
  title: "Moth Study",
  description: "A study",
  medium: "Gouache",
  type: "personal" as const,
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
  tagIds: ["65a1e0a0c4d5e6f7a8b9c0aa"],
  completionDate: "2026-06-30T00:00:00.000Z",
  colorPalette: null,
  createdAt: "2026-06-30T00:00:00.000Z",
  updatedAt: "2026-06-30T00:00:00.000Z",
};

describe("GET /api/artworks/:slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findArtworkBySlug).mockResolvedValue(artwork);
    vi.mocked(findTagsByIds).mockResolvedValue([
      {
        id: "65a1e0a0c4d5e6f7a8b9c0aa",
        name: "Gouache",
        slug: "gouache",
        usageCount: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("returns full detail including NSFW artwork", async () => {
    const req = new NextRequest("http://localhost/api/artworks/moth-study");
    const res = await GET(req, { params: Promise.resolve({ id: "moth-study" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slug).toBe("moth-study");
    expect(json.nsfw).toBe(true);
    expect(json.tags).toEqual([
      { id: "65a1e0a0c4d5e6f7a8b9c0aa", name: "Gouache", slug: "gouache" },
    ]);
    expect(findArtworkBySlug).toHaveBeenCalledWith("moth-study", true);
  });

  it("returns 404 when slug does not exist", async () => {
    vi.mocked(findArtworkBySlug).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/artworks/missing");
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });
});
