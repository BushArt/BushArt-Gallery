import { describe, it, expect } from "vitest";
import { toArtworkDetailResponse } from "@/lib/api/artwork-response";
import type { Artwork } from "@/types/artwork";
import type { Tag } from "@/types/tag";

const artwork: Artwork = {
  id: "65a1a1a1a1a1a1a1a1a1a1a1",
  slug: "moth-study",
  title: "Moth Study",
  description: "A study",
  medium: "Gouache",
  type: "personal",
  nsfw: false,
  completionDate: "2024-03-01T00:00:00.000Z",
  images: [
    { publicId: "bushart/b", url: "https://x/b", width: 100, height: 100, order: 1 },
    { publicId: "bushart/a", url: "https://x/a", width: 200, height: 200, order: 0 },
  ],
  timelapse: {
    publicId: "bushart/tl",
    url: "https://x/tl",
    durationSeconds: 30,
    width: 1920,
    height: 1080,
  },
  tagIds: ["65b1b1b1b1b1b1b1b1b1b1b1"],
  featured: false,
  featuredOrder: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tags: Tag[] = [
  {
    id: "65b1b1b1b1b1b1b1b1b1b1b1",
    name: "Nature",
    slug: "nature",
    usageCount: 1,
    createdAt: new Date(),
  },
];

describe("toArtworkDetailResponse", () => {
  it("maps artwork and tags to the public detail shape", () => {
    const result = toArtworkDetailResponse(artwork, tags);
    expect(result.id).toBe(artwork.id);
    expect(result.slug).toBe("moth-study");
    expect(result.description).toBe("A study");
    expect(result.tags).toEqual([{ id: tags[0].id, name: "Nature", slug: "nature" }]);
  });

  it("sorts images by order and strips url fields", () => {
    const result = toArtworkDetailResponse(artwork, tags);
    expect(result.images).toEqual([
      { publicId: "bushart/a", width: 200, height: 200, order: 0 },
      { publicId: "bushart/b", width: 100, height: 100, order: 1 },
    ]);
  });

  it("includes timelapse metadata without url", () => {
    const result = toArtworkDetailResponse(artwork, tags);
    expect(result.timelapse).toEqual({
      publicId: "bushart/tl",
      durationSeconds: 30,
      width: 1920,
      height: 1080,
    });
  });

  it("returns null timelapse when absent", () => {
    const result = toArtworkDetailResponse({ ...artwork, timelapse: null }, tags);
    expect(result.timelapse).toBeNull();
  });

  it("coerces missing description to null", () => {
    const result = toArtworkDetailResponse({ ...artwork, description: undefined }, tags);
    expect(result.description).toBeNull();
  });
});
