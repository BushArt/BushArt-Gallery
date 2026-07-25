export interface ImageAsset {
  publicId: string;
  url: string;
  width: number;
  height: number;
  order: number;
}

export interface VideoAsset {
  publicId: string;
  url: string;
  durationSeconds: number;
  width: number;
  height: number;
}

export interface Artwork {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  medium: string;
  type: "personal" | "commission";
  nsfw: boolean;
  featured: boolean;
  featuredOrder: number | null;
  images: ImageAsset[];
  timelapse: VideoAsset | null;
  tagIds: string[];
  completionDate: string;
  colorPalette: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Lean shape returned by the gallery-feed list endpoint. */
export interface ArtworkListItem {
  id: string;
  slug: string;
  title: string;
  medium: string;
  type: "personal" | "commission";
  nsfw: boolean;
  completionDate: string;
  coverImage: Pick<ImageAsset, "publicId" | "width" | "height">;
  tagSlugs: string[];
}