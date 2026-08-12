import { z } from "zod";

export const TagSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "name is required").max(40, "name must be <= 40 chars"),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase hyphen-separated"),
  usageCount: z.number().int().nonnegative(),
  createdAt: z.string().refine((v) => !isNaN(Date.parse(v)), "createdAt must be a valid date"),
});

export type Tag = z.infer<typeof TagSchema>;

/** Request body for POST /api/tags (05 §8.1) */
export const TagCreateRequestSchema = z.object({
  name: z.string().min(1, "name is required").max(40, "name must be <= 40 chars"),
});

export type TagCreateRequest = z.infer<typeof TagCreateRequestSchema>;