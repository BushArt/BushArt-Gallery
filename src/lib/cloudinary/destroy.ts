import "server-only";

import { getCloudinary } from "./client";

export type DestroyAsset = {
  publicId: string;
  resourceType: "image" | "video";
};

/**
 * Delete one or more Cloudinary assets by public id.
 * Used when removing artwork media so storage quota is not consumed by orphans.
 */
export async function destroyAssets(assets: DestroyAsset[]): Promise<void> {
  if (assets.length === 0) return;

  const cld = getCloudinary();
  await Promise.all(
    assets.map(({ publicId, resourceType }) =>
      cld.uploader.destroy(publicId, { resource_type: resourceType }),
    ),
  );
}
