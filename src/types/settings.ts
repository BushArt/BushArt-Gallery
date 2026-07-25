import type { ImageAsset } from "./artwork";

export interface SocialLink {
  platform: string;
  url: string;
}

export interface SiteSettings {
  id: string;
  artistName: string;
  tagline: string | null;
  biography: string | null;
  profileImage: ImageAsset | null;
  bannerImage: ImageAsset | null;
  socialLinks: SocialLink[];
  contactEmail: string | null;
  contactUrl: string | null;
  updatedAt: string;
}
