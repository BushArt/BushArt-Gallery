import { z } from "zod";
import { ImageAssetSchema } from "./artwork";

export const SocialLinkSchema = z.object({
  platform: z.string().min(1, "platform is required").max(40, "platform must be <= 40 chars"),
  url: z.string().url(),
});

export const SiteSettingsSchema = z.object({
  artistName: z.string().min(1, "artistName is required").max(200, "artistName must be <= 200 chars"),
  tagline: z.string().optional().nullable(),
  biography: z.string().optional().nullable(),
  profileImage: ImageAssetSchema.nullable().optional(),
  bannerImage: ImageAssetSchema.nullable().optional(),
  socialLinks: z.array(SocialLinkSchema),
  contactEmail: z.string().email().optional().nullable(),
  contactUrl: z.string().url().optional().nullable(),
  updatedAt: z.string().refine((v) => v === undefined || v === null || !isNaN(Date.parse(v)), "updatedAt must be a valid date").optional(),
});

export type SiteSettings = z.infer<typeof SiteSettingsSchema>;
export type SocialLink = z.infer<typeof SocialLinkSchema>;