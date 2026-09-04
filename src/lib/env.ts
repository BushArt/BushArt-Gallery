import { z } from "zod";

const requiredRuntimeEnv = z.object({
  MONGODB_URI: z.string().trim().min(1),
  JWT_SECRET: z.string().trim().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().trim().min(1),
  CLOUDINARY_API_KEY: z.string().trim().min(1),
  CLOUDINARY_API_SECRET: z.string().trim().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().trim().url(),
});

export type RuntimeEnv = z.infer<typeof requiredRuntimeEnv>;

export function validateRuntimeEnv(
  source: Record<string, string | undefined> = process.env,
): RuntimeEnv {
  const result = requiredRuntimeEnv.safeParse(source);
  if (result.success) {
    if (process.env.NODE_ENV === "production" && result.data.JWT_SECRET.length < 32) {
      throw new Error("Invalid runtime environment: JWT_SECRET must be at least 32 characters in production");
    }
    return result.data;
  }

  const fields = result.error.issues
    .map((issue) => issue.path.join(".") || "environment")
    .join(", ");
  throw new Error(`Invalid runtime environment. Set valid values for: ${fields}`);
}
