import type { NextConfig } from "next";

/**
 * Browser bundles only receive NEXT_PUBLIC_* env vars. Mirror the server
 * cloud name when the public copy is omitted so local .env.local files that
 * only set CLOUDINARY_CLOUD_NAME still work (see 02-Technical-Specification §9).
 */
const publicCloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME ?? "";

const nextConfig: NextConfig = {
  cacheComponents: true,
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: publicCloudName,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
