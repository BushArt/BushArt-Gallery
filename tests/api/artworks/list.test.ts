import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/models/artwork", () => ({
  listArtworks: vi.fn(),
}));

import { GET } from "@/app/api/artworks/route";
import { listArtworks } from "@/lib/db/models/artwork";

const sampleItem = {
  id: "65a1f2b3c4d5e6f7a8b9c0d1",
  slug: "moth-study",
  title: "Moth Study",
  medium: "Gouache",
  type: "personal" as const,
  nsfw: false,
  completionDate: "2026-06-30T00:00:00.000Z",
  coverImage: { publicId: "bushart/artworks/moth/main", width: 100, height: 100 },
  tagSlugs: ["gouache"],
};

function listRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/artworks${query}`);
}

describe("GET /api/artworks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listArtworks).mockResolvedValue({
      items: [sampleItem],
      nextCursor: "cursor-abc",
      hasMore: true,
    });
  });

  it("returns paginated feed with default params", async () => {
    const res = await GET(listRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.hasMore).toBe(true);
    expect(listArtworks).toHaveBeenCalledWith(
      expect.objectContaining({ nsfw: "exclude", sort: "recent", limit: 24 }),
    );
  });

  it("passes filter combinations to listArtworks", async () => {
    await GET(
      listRequest(
        "?tags=gouache,insects&year=2026&medium=Gouache&type=commission&nsfw=include&sort=oldest&limit=60&cursor=abc",
      ),
    );
    expect(listArtworks).toHaveBeenCalledWith({
      tags: ["gouache", "insects"],
      year: 2026,
      medium: "Gouache",
      type: "commission",
      nsfw: "include",
      sort: "oldest",
      limit: 60,
      cursor: "abc",
    });
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

  it("returns 400 VALIDATION_ERROR when listArtworks rejects cursor", async () => {
    vi.mocked(listArtworks).mockRejectedValue(new Error("Invalid cursor"));
    const res = await GET(listRequest("?cursor=bad"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toBe("Invalid cursor");
  });

  it("defaults nsfw to exclude per spec", async () => {
    await GET(listRequest());
    expect(listArtworks).toHaveBeenCalledWith(expect.objectContaining({ nsfw: "exclude" }));
  });
});
