import { describe, it, expect } from "vitest";
import { ArtworkSchema, ArtworkListItemSchema, ImageAssetSchema, VideoAssetSchema } from "@/lib/validation/artwork";

describe("ImageAssetSchema", () => {
  it("accepts valid asset", () => {
    expect(() =>
      ImageAssetSchema.parse({
        publicId: "bushart/artworks/x/main",
        url: "https://res.cloudinary.com/bushart/image/upload/v123/x.jpg",
        width: 1000,
        height: 1200,
        order: 0,
      }),
    ).not.toThrow();
  });

  it("rejects negative width/height", () => {
    expect(() => ImageAssetSchema.parse({ publicId: "a", url: "https://a", width: -1, height: 1, order: 0 })).toThrow();
  });

  it("rejects negative order", () => {
    expect(() => ImageAssetSchema.parse({ publicId: "a", url: "https://a", width: 1, height: 1, order: -1 })).toThrow();
  });

  it("rejects zero width/height", () => {
    expect(() => ImageAssetSchema.parse({ publicId: "a", url: "https://a", width: 0, height: 1, order: 0 })).toThrow();
    expect(() => ImageAssetSchema.parse({ publicId: "a", url: "https://a", width: 1, height: 0, order: 0 })).toThrow();
  });
});

describe("VideoAssetSchema", () => {
  it("accepts valid asset", () => {
    expect(() =>
      VideoAssetSchema.parse({
        publicId: "bushart/artworks/x/t",
        url: "https://res.cloudinary.com/bushart/video/upload/v123/x.mp4",
        durationSeconds: 60,
        width: 1920,
        height: 1080,
      }),
    ).not.toThrow();
  });

  it("rejects non-positive duration", () => {
    expect(() =>
      VideoAssetSchema.parse({
        publicId: "a",
        url: "https://a",
        durationSeconds: 0,
        width: 1,
        height: 1,
      }),
    ).toThrow();
  });

  it("rejects zero width/height", () => {
    expect(() =>
      VideoAssetSchema.parse({
        publicId: "a",
        url: "https://a",
        durationSeconds: 10,
        width: 0,
        height: 1,
      }),
    ).toThrow();
    expect(() =>
      VideoAssetSchema.parse({
        publicId: "a",
        url: "https://a",
        durationSeconds: 10,
        width: 1,
        height: 0,
      }),
    ).toThrow();
  });
});

describe("ArtworkSchema", () => {
  const validArtwork = {
    id: "66a1f2b3c4d5e6f7a8b9c0d1",
    slug: "test-piece",
    title: "Test",
    medium: "Ink",
    type: "personal" as const,
    nsfw: false,
    featured: false,
    images: [
      {
        publicId: "bushart/artworks/test/main",
        url: "https://res.cloudinary.com/bushart/image/upload/v1/test.jpg",
        width: 1000,
        height: 1200,
        order: 0,
      },
    ],
    tagIds: ["66a1e0a0c4d5e6f7a8b9c0aa"],
    completionDate: "2026-06-30T00:00:00.000Z",
  };

  it("accepts valid artwork", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork })).not.toThrow();
  });

  it("rejects invalid slug characters", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork, slug: "Test_Piece" })).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork, title: "" })).toThrow();
  });

  it("rejects title >200 chars", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork, title: "x".repeat(201) })).toThrow();
  });

  it("rejects description >5000 chars", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork, description: "x".repeat(5001) })).toThrow();
  });

  it("rejects wrong type enum", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork, type: "other" })).toThrow();
  });

  it("accepts empty tagIds", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork, tagIds: [] })).not.toThrow();
  });

  it("requires at least 1 image and rejects >20", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork, images: [] })).toThrow();
    expect(() =>
      ArtworkSchema.parse({
        ...validArtwork,
        images: Array.from({ length: 21 }).map((_, i) => ({
          publicId: `bushart/artworks/test/main-${i}`,
          url: "https://res.cloudinary.com/bushart/image/upload/v1/test.jpg",
          width: 1000,
          height: 1200,
          order: i,
        })),
      }),
    ).toThrow();
  });

  it("requires featuredOrder when featured is true", () => {
    expect(() =>
      ArtworkSchema.parse({ ...validArtwork, featured: true, featuredOrder: null }),
    ).toThrow();
    expect(() =>
      ArtworkSchema.parse({ ...validArtwork, featured: true, featuredOrder: 1 }),
    ).not.toThrow();
  });

  it("accepts featuredOrder: 0 when featured is true", () => {
    expect(() =>
      ArtworkSchema.parse({ ...validArtwork, featured: true, featuredOrder: 0 }),
    ).not.toThrow();
  });

  it("requires featuredOrder to be null when featured is false", () => {
    expect(() =>
      ArtworkSchema.parse({ ...validArtwork, featured: false, featuredOrder: 1 }),
    ).toThrow();
    expect(() =>
      ArtworkSchema.parse({ ...validArtwork, featured: false, featuredOrder: null }),
    ).not.toThrow();
    expect(() =>
      ArtworkSchema.parse({ ...validArtwork, featured: false }),
    ).not.toThrow();
  });

  it("accepts null timelapse", () => {
    expect(() => ArtworkSchema.parse({ ...validArtwork, timelapse: null })).not.toThrow();
  });

  it("accepts valid timelapse", () => {
    expect(() =>
      ArtworkSchema.parse({
        ...validArtwork,
        timelapse: {
          publicId: "bushart/artworks/test/t",
          url: "https://res.cloudinary.com/bushart/video/upload/v1/t.mp4",
          durationSeconds: 30,
          width: 1000,
          height: 800,
        },
      }),
    ).not.toThrow();
  });

  it("accepts date-only strings for datetime fields", () => {
    expect(() =>
      ArtworkSchema.parse({
        ...validArtwork,
        completionDate: "2026-06-30",
        createdAt: "2026-07-01",
        updatedAt: "2026-07-01",
      }),
    ).not.toThrow();
  });

  it("rejects completely invalid date strings", () => {
    expect(() =>
      ArtworkSchema.parse({
        ...validArtwork,
        completionDate: "not-a-date",
      }),
    ).toThrow();
  });
});

describe("ArtworkListItemSchema", () => {
  it("parses a valid list item", () => {
    expect(() =>
      ArtworkListItemSchema.parse({
        id: "66a1f2b3c4d5e6f7a8b9c0d1",
        slug: "test-piece",
        title: "Test",
        medium: "Ink",
        type: "personal",
        nsfw: false,
        completionDate: "2026-06-30T00:00:00.000Z",
        images: [
          {
            publicId: "bushart/artworks/test/main",
            url: "https://res.cloudinary.com/bushart/image/upload/v1/test.jpg",
            width: 1000,
            height: 1200,
            order: 0,
          },
        ],
        tagIds: ["66a1e0a0c4d5e6f7a8b9c0aa"],
      }),
    ).not.toThrow();
  });

  it("extracts coverImage from lowest-order image", () => {
    const parsed = ArtworkListItemSchema.parse({
      id: "66a1f2b3c4d5e6f7a8b9c0d1",
      slug: "test-piece",
      title: "Test",
      medium: "Ink",
      type: "personal",
      nsfw: false,
      completionDate: "2026-06-30T00:00:00.000Z",
      description: "A".repeat(200),
      images: [
        {
          publicId: "bushart/artworks/test/second",
          url: "https://res.cloudinary.com/bushart/image/upload/v1/second.jpg",
          width: 500,
          height: 500,
          order: 1,
        },
        {
          publicId: "bushart/artworks/test/main",
          url: "https://res.cloudinary.com/bushart/image/upload/v1/test.jpg",
          width: 1000,
          height: 1200,
          order: 0,
        },
      ],
      tagIds: [],
    });
    expect(parsed.coverImage.publicId).toBe("bushart/artworks/test/main");
    expect(parsed.descriptionPreview).toContain("…");
  });
});
