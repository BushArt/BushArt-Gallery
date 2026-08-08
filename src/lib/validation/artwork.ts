import { z } from "zod";

export const ImageAssetSchema = z.object({
  publicId: z.string(),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  order: z.number().int().nonnegative(),
});

export const VideoAssetSchema = z.object({
  publicId: z.string(),
  url: z.string().url(),
  durationSeconds: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const ArtworkBaseSchema = z.object({
  id: z.string(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase hyphen-separated"),
  title: z
    .string()
    .min(1, "title is required")
    .max(200, "title must be <= 200 chars"),
  description: z
    .string()
    .max(5000, "description must be <= 5000 chars")
    .optional()
    .nullable(),
  medium: z.string().min(1, "medium is required").max(100, "medium must be <= 100 chars"),
  type: z.enum(["personal", "commission"]),
  nsfw: z.boolean(),
  featured: z.boolean(),
  featuredOrder: z.number().nullable().optional(),
  images: z
    .array(ImageAssetSchema)
    .min(1, "at least 1 image is required")
    .max(20, "max 20 images"),
  timelapse: VideoAssetSchema.nullable().optional(),
  tagIds: z.array(z.string()),
  completionDate: z.string().refine((v) => !isNaN(Date.parse(v)), "completionDate must be a valid date"),
  colorPalette: z.array(z.string()).optional().nullable(),
  createdAt: z.string().refine((v) => v === undefined || v === null || !isNaN(Date.parse(v)), "createdAt must be a valid date").optional(),
  updatedAt: z.string().refine((v) => v === undefined || v === null || !isNaN(Date.parse(v)), "updatedAt must be a valid date").optional(),
});

export const ArtworkSchema = ArtworkBaseSchema
  .refine(
    (val) => {
      if (val.featured) {
        return typeof val.featuredOrder === "number" && !Number.isNaN(val.featuredOrder);
      }
      return true;
    },
    {
      message: "featuredOrder is required when featured is true",
      path: ["featuredOrder"],
    },
  )
  .refine(
    (val) => {
      if (!val.featured) {
        return val.featuredOrder === null || val.featuredOrder === undefined;
      }
      return true;
    },
    {
      message: "featuredOrder must be null when featured is false",
      path: ["featuredOrder"],
    },
  );

/**
 * Minimal shape for the gallery feed.
 *
 * `tagSlugs` is intentionally left as an empty array here — the DB layer
 * resolves tag IDs to slugs after projection and overwrites this field.
 */
export const ArtworkListItemSchema = ArtworkBaseSchema
  .pick({
    id: true,
    slug: true,
    title: true,
    medium: true,
    type: true,
    nsfw: true,
    completionDate: true,
    images: true,
    tagIds: true,
  })
  .transform((val) => ({
    id: val.id,
    slug: val.slug,
    title: val.title,
    medium: val.medium,
    type: val.type,
    nsfw: val.nsfw,
    completionDate: val.completionDate,
    coverImage: {
      publicId: val.images[0]?.publicId ?? "",
      width: val.images[0]?.width ?? 0,
      height: val.images[0]?.height ?? 0,
    },
    tagSlugs: [] as string[],
  }));

export type Artwork = z.infer<typeof ArtworkSchema>;
export type ArtworkListItem = z.output<typeof ArtworkListItemSchema>;
export type ImageAsset = z.infer<typeof ImageAssetSchema>;
export type VideoAsset = z.infer<typeof VideoAssetSchema>;