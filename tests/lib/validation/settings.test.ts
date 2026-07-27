import { describe, it, expect } from "vitest";
import { SiteSettingsSchema, SocialLinkSchema } from "@/lib/validation/settings";

describe("SocialLinkSchema", () => {
  it("accepts valid link", () => {
    expect(() =>
      SocialLinkSchema.parse({ platform: "Instagram", url: "https://instagram.com/example" }),
    ).not.toThrow();
  });
});

describe("SiteSettingsSchema", () => {
  it("accepts valid settings", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        tagline: "Digital Sketchbook & Gallery",
        biography: "I make quiet work.",
        profileImage: {
          publicId: "bushart/site/profile",
          url: "https://res.cloudinary.com/bushart/image/upload/v1/profile.jpg",
          width: 800,
          height: 800,
          order: 0,
        },
        bannerImage: null,
        socialLinks: [{ platform: "Instagram", url: "https://instagram.com/example" }],
        contactEmail: "hello@example.com",
        contactUrl: "https://example.com/contact",
        updatedAt: "2026-07-10T12:00:00.000Z",
      }),
    ).not.toThrow();
  });

  it("rejects empty artistName", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "",
        socialLinks: [],
      }),
    ).toThrow();
  });

  it("rejects artistName >200 chars", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "x".repeat(201),
        socialLinks: [],
      }),
    ).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        socialLinks: [],
        contactEmail: "not-an-email",
      }),
    ).toThrow();
  });

  it("rejects invalid contactUrl", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        socialLinks: [],
        contactUrl: "not-a-url",
      }),
    ).toThrow();
  });

  it("accepts null profileImage/bannerImage and empty socialLinks", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        profileImage: null,
        bannerImage: null,
        socialLinks: [],
        contactEmail: null,
        contactUrl: null,
        updatedAt: "2026-07-10T12:00:00.000Z",
      }),
    ).not.toThrow();
  });

  it("rejects empty socialLinks platform", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        socialLinks: [{ platform: "", url: "https://instagram.com/example" }],
      }),
    ).toThrow();
  });

  it("rejects invalid socialLinks url", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        socialLinks: [{ platform: "Instagram", url: "not-a-url" }],
      }),
    ).toThrow();
  });

  it("accepts settings without updatedAt", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        socialLinks: [],
      }),
    ).not.toThrow();
  });

  it("accepts updatedAt when provided", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        socialLinks: [],
        updatedAt: "2026-07-10T12:00:00.000Z",
      }),
    ).not.toThrow();
  });

  it("rejects invalid updatedAt format", () => {
    expect(() =>
      SiteSettingsSchema.parse({
        artistName: "Bush",
        socialLinks: [],
        updatedAt: "not-a-date",
      }),
    ).toThrow();
  });
});
