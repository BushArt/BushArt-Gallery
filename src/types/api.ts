import type { ArtworkListItem } from "@/types/artwork";
import type { Tag } from "@/types/tag";

/** Public GET /api/settings response shape (05 §4.5) */
export interface PublicSettingsResponse {
  artistName: string;
  tagline: string | null;
  biography: string | null;
  profileImage: {
    publicId: string;
    width: number;
    height: number;
  } | null;
  bannerImage: {
    publicId: string;
    width: number;
    height: number;
  } | null;
  socialLinks: { platform: string; url: string }[];
  contactEmail: string | null;
  contactUrl: string | null;
}

/** GET /api/artworks paginated response (05 §4.1) */
export interface ArtworkListResponse {
  items: ArtworkListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** GET /api/tags response (05 §4.4) */
export interface TagListResponse {
  items: Tag[];
}

/** GET /api/artworks/:slug detail response (05 §4.2) */
export interface ArtworkDetailResponse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  medium: string;
  type: "personal" | "commission";
  nsfw: boolean;
  completionDate: string;
  images: {
    publicId: string;
    width: number;
    height: number;
    order: number;
  }[];
  timelapse: {
    publicId: string;
    durationSeconds: number;
    width: number;
    height: number;
  } | null;
  tags: { id: string; name: string; slug: string }[];
}
