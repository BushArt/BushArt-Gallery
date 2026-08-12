import type { SiteSettings } from "@/types/settings";
import type { ImageAsset } from "@/types/artwork";

function stripImageUrl(image: ImageAsset | null | undefined) {
  if (!image) return null;
  return {
    publicId: image.publicId,
    width: image.width,
    height: image.height,
  };
}

/** Public GET shape per 05-API-Specification.md §4.5 (excludes updatedAt and internal url fields). */
export function toPublicSettingsResponse(settings: SiteSettings | null) {
  if (!settings) {
    return {
      artistName: "",
      tagline: null,
      biography: null,
      profileImage: null,
      bannerImage: null,
      socialLinks: [] as SiteSettings["socialLinks"],
      contactEmail: null,
      contactUrl: null,
    };
  }

  return {
    artistName: settings.artistName ?? "",
    tagline: settings.tagline ?? null,
    biography: settings.biography ?? null,
    profileImage: stripImageUrl(settings.profileImage),
    bannerImage: stripImageUrl(settings.bannerImage),
    socialLinks: settings.socialLinks ?? [],
    contactEmail: settings.contactEmail ?? null,
    contactUrl: settings.contactUrl ?? null,
  };
}
