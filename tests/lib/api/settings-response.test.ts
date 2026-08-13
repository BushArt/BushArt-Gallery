import { describe, it, expect } from "vitest";
import { toPublicSettingsResponse } from "@/lib/api/settings-response";
import type { SiteSettings } from "@/types/settings";

const fullSettings: SiteSettings = {
  id: "settings-1",
  artistName: "Bush",
  tagline: "Digital art",
  biography: "Bio text",
  profileImage: {
    publicId: "bushart/profile",
    url: "https://res.cloudinary.com/test/profile",
    width: 400,
    height: 400,
  },
  bannerImage: {
    publicId: "bushart/banner",
    url: "https://res.cloudinary.com/test/banner",
    width: 1200,
    height: 400,
  },
  socialLinks: [{ platform: "instagram", url: "https://instagram.com/bush" }],
  contactEmail: "bush@example.com",
  contactUrl: null,
  updatedAt: new Date(),
};

describe("toPublicSettingsResponse", () => {
  it("returns zero-state defaults when settings is null", () => {
    expect(toPublicSettingsResponse(null)).toEqual({
      artistName: "",
      tagline: null,
      biography: null,
      profileImage: null,
      bannerImage: null,
      socialLinks: [],
      contactEmail: null,
      contactUrl: null,
    });
  });

  it("strips internal url fields from image assets", () => {
    const result = toPublicSettingsResponse(fullSettings);
    expect(result.profileImage).toEqual({
      publicId: "bushart/profile",
      width: 400,
      height: 400,
    });
    expect(result.bannerImage).toEqual({
      publicId: "bushart/banner",
      width: 1200,
      height: 400,
    });
  });

  it("maps text fields and social links", () => {
    const result = toPublicSettingsResponse(fullSettings);
    expect(result.artistName).toBe("Bush");
    expect(result.tagline).toBe("Digital art");
    expect(result.biography).toBe("Bio text");
    expect(result.socialLinks).toHaveLength(1);
    expect(result.contactEmail).toBe("bush@example.com");
  });

  it("defaults missing optional fields to null or empty", () => {
    const result = toPublicSettingsResponse({
      ...fullSettings,
      tagline: undefined,
      biography: undefined,
      profileImage: null,
      bannerImage: null,
      socialLinks: undefined,
      contactEmail: undefined,
      contactUrl: undefined,
    });
    expect(result.tagline).toBeNull();
    expect(result.biography).toBeNull();
    expect(result.profileImage).toBeNull();
    expect(result.socialLinks).toEqual([]);
    expect(result.contactEmail).toBeNull();
  });
});
