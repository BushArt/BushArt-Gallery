import { describe, it, expect } from "vitest";
import {
  ArtworkCreateRequestSchema,
  ArtworkPatchRequestSchema,
  ArtworkListQuerySchema,
  ArtworkDownloadQuerySchema,
} from "@/lib/validation/artwork";
import { TagCreateRequestSchema } from "@/lib/validation/tag";
import { SiteSettingsPatchSchema } from "@/lib/validation/settings";

/**
 * Schema contract tests (TODO-042).
 *
 * These tests pin the Zod validation schemas to `05-API-Specification.md`.
 * If a field is added to or removed from the API spec, the corresponding
 * schema and this contract test must be updated together — a deliberate,
 * reviewable change rather than silent drift.
 *
 * Each test group verifies both positive (valid per spec) and negative
 * (invalid per spec) cases for every documented request/response shape.
 */

describe("POST /api/artworks create request schema (05 §7.1)", () => {
  const valid = {
    title: "Test Piece",
    slug: "test-piece",
    medium: "Ink",
    type: "personal" as const,
    nsfw: false,
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

  it("accepts a valid create request", () => {
    expect(() => ArtworkCreateRequestSchema.parse(valid)).not.toThrow();
  });

  it("accepts featured with featuredOrder number", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, featured: true, featuredOrder: 1 }),
    ).not.toThrow();
  });

  it("accepts featured false without featuredOrder", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, featured: false }),
    ).not.toThrow();
  });

  it("requires featuredOrder when featured is true", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, featured: true }),
    ).toThrow();
  });

  it("rejects featuredOrder when featured is false", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({
        ...valid,
        featured: false,
        featuredOrder: 1,
      }),
    ).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => ArtworkCreateRequestSchema.parse({ ...valid, title: "" })).toThrow();
  });

  it("rejects title > 200 chars", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, title: "x".repeat(201) }),
    ).toThrow();
  });

  it("rejects invalid slug", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, slug: "Test_Piece" }),
    ).toThrow();
  });

  it("requires at least 1 image", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, images: [] }),
    ).toThrow();
  });

  it("requires unique tagIds", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, tagIds: ["a", "a"] }),
    ).toThrow();
  });

  it("requires 24-char hex tagIds", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, tagIds: ["too-short"] }),
    ).toThrow();
  });

  it("rejects invalid completionDate", () => {
    expect(() =>
      ArtworkCreateRequestSchema.parse({ ...valid, completionDate: "not-a-date" }),
    ).toThrow();
  });

  it("defaults featured to false", () => {
    const parsed = ArtworkCreateRequestSchema.parse({ ...valid });
    expect(parsed.featured).toBe(false);
  });

  it("defaults featuredOrder to null", () => {
    const parsed = ArtworkCreateRequestSchema.parse({ ...valid });
    expect(parsed.featuredOrder).toBe(null);
  });
});

describe("PATCH /api/artworks/:id patch request schema (05 §7.2)", () => {
  const valid = {
    title: "Updated Title",
  };

  it("accepts a partial patch body", () => {
    expect(() => ArtworkPatchRequestSchema.parse(valid)).not.toThrow();
  });

  it("accepts an empty patch body", () => {
    expect(() => ArtworkPatchRequestSchema.parse({})).not.toThrow();
  });

  it("accepts featured with featuredOrder", () => {
    expect(() =>
      ArtworkPatchRequestSchema.parse({ featured: true, featuredOrder: 2 }),
    ).not.toThrow();
  });

  it("requires featuredOrder when featured is true", () => {
    expect(() => ArtworkPatchRequestSchema.parse({ featured: true })).toThrow();
  });

  it("rejects invalid type enum", () => {
    expect(() =>
      ArtworkPatchRequestSchema.parse({ type: "sculpture" as any }),
    ).toThrow();
  });
});

describe("GET /api/artworks list query schema (05 §4.1)", () => {
  it("accepts default query params", () => {
    expect(() => ArtworkListQuerySchema.parse({})).not.toThrow();
  });

  it("accepts tags filter", () => {
    expect(() => ArtworkListQuerySchema.parse({ tags: "portrait,sketch" })).not.toThrow();
  });

  it("accepts year filter", () => {
    expect(() => ArtworkListQuerySchema.parse({ year: 2023 })).not.toThrow();
  });

  it("rejects year out of range", () => {
    expect(() => ArtworkListQuerySchema.parse({ year: 1899 })).toThrow();
    expect(() => ArtworkListQuerySchema.parse({ year: 2101 })).toThrow();
  });

  it("defaults nsfw to exclude", () => {
    const parsed = ArtworkListQuerySchema.parse({});
    expect(parsed.nsfw).toBe("exclude");
  });

  it("defaults sort to recent", () => {
    const parsed = ArtworkListQuerySchema.parse({});
    expect(parsed.sort).toBe("recent");
  });

  it("defaults limit to 24", () => {
    const parsed = ArtworkListQuerySchema.parse({});
    expect(parsed.limit).toBe(24);
  });

  it("rejects limit > 60", () => {
    expect(() => ArtworkListQuerySchema.parse({ limit: 61 })).toThrow();
  });

  it("rejects limit < 1", () => {
    expect(() => ArtworkListQuerySchema.parse({ limit: 0 })).toThrow();
  });
});

describe("GET /api/artworks/:slug/download query schema (05 §4.3)", () => {
  it("accepts default download params", () => {
    expect(() => ArtworkDownloadQuerySchema.parse({})).not.toThrow();
  });

  it("accepts image index and asset type", () => {
    expect(() =>
      ArtworkDownloadQuerySchema.parse({ image: 1, asset: "timelapse" }),
    ).not.toThrow();
  });

  it("defaults image to 0", () => {
    const parsed = ArtworkDownloadQuerySchema.parse({});
    expect(parsed.image).toBe(0);
  });

  it("defaults asset to image", () => {
    const parsed = ArtworkDownloadQuerySchema.parse({});
    expect(parsed.asset).toBe("image");
  });
});

describe("POST /api/tags create request schema (05 §8.1)", () => {
  it("accepts a valid tag name", () => {
    expect(() => TagCreateRequestSchema.parse({ name: "Portrait" })).not.toThrow();
  });

  it("rejects empty name", () => {
    expect(() => TagCreateRequestSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name > 40 chars", () => {
    expect(() => TagCreateRequestSchema.parse({ name: "x".repeat(41) })).toThrow();
  });
});

describe("PATCH /api/settings patch request schema (05 §9.1)", () => {
  it("accepts partial settings update", () => {
    expect(() =>
      SiteSettingsPatchSchema.parse({ artistName: "New Name" }),
    ).not.toThrow();
  });

  it("accepts empty settings patch", () => {
    expect(() => SiteSettingsPatchSchema.parse({})).not.toThrow();
  });

  it("accepts valid social links array", () => {
    expect(() =>
      SiteSettingsPatchSchema.parse({
        socialLinks: [{ platform: "Instagram", url: "https://instagram.com/artist" }],
      }),
    ).not.toThrow();
  });

  it("rejects invalid social link URL", () => {
    expect(() =>
      SiteSettingsPatchSchema.parse({
        socialLinks: [{ platform: "Instagram", url: "not-a-url" }],
      }),
    ).toThrow();
  });

  it("rejects invalid contact email", () => {
    expect(() =>
      SiteSettingsPatchSchema.parse({ contactEmail: "not-an-email" }),
    ).toThrow();
  });

  it("omits updatedAt from patch schema", () => {
    const keys = Object.keys(SiteSettingsPatchSchema.shape);
    expect(keys).not.toContain("updatedAt");
  });
});