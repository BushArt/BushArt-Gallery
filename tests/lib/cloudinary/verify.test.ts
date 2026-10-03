import { describe, it, expect, vi, beforeEach } from "vitest";

// "server-only" throws when imported outside a Server Component graph.
vi.mock("server-only", () => ({}));

const apiResource = vi.fn();

vi.mock("@/lib/cloudinary/client", () => ({
  getCloudinary: () => ({
    api: { resource: apiResource },
  }),
}));

import {
  describeAssetRejections,
  verifyAssetOwnership,
  verifyAssetOwnershipAll,
} from "@/lib/cloudinary/verify";

function httpError(status: number): Error & { http_code: number } {
  return Object.assign(new Error(`HTTP ${status}`), { http_code: status });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifyAssetOwnership", () => {
  it("accepts an asset whose Admin API entry is in the bushart/ namespace", async () => {
    apiResource.mockResolvedValue({
      public_id: "bushart/uploads/a1b2",
      asset_folder: "bushart/uploads",
    });

    await expect(
      verifyAssetOwnership({ publicId: "bushart/uploads/a1b2", resourceType: "image" }),
    ).resolves.toBeNull();
  });

  it("rejects an asset Cloudinary does not know about", async () => {
    apiResource.mockRejectedValue(httpError(404));

    await expect(
      verifyAssetOwnership({ publicId: "bushart/uploads/ghost", resourceType: "image" }),
    ).resolves.toEqual({
      publicId: "bushart/uploads/ghost",
      resourceType: "image",
      reason: "missing",
    });
  });

  it("rejects an asset that exists but lives outside the app namespace", async () => {
    apiResource.mockResolvedValue({
      public_id: "other-tenant/secret",
      asset_folder: "other-tenant",
    });

    await expect(
      verifyAssetOwnership({ publicId: "other-tenant/secret", resourceType: "image" }),
    ).resolves.toEqual({
      publicId: "other-tenant/secret",
      resourceType: "image",
      reason: "foreign",
    });
  });

  // A transient Admin API failure must not be misread as "asset missing",
  // which would reject a legitimate upload.
  it("propagates a non-404 Admin API failure instead of reporting it missing", async () => {
    apiResource.mockRejectedValue(httpError(503));

    await expect(
      verifyAssetOwnership({ publicId: "bushart/uploads/a1b2", resourceType: "image" }),
    ).rejects.toThrow("HTTP 503");
  });

  it("derives the folder from the folder field when asset_folder is absent", async () => {
    apiResource.mockResolvedValue({
      public_id: "bushart/uploads/a1b2",
      folder: "/bushart/uploads/",
    });

    await expect(
      verifyAssetOwnership({ publicId: "bushart/uploads/a1b2", resourceType: "image" }),
    ).resolves.toBeNull();
  });

  it("passes the resource type through so videos are not probed as images", async () => {
    apiResource.mockResolvedValue({ public_id: "bushart/uploads/clip", asset_folder: "bushart/uploads" });

    await verifyAssetOwnership({ publicId: "bushart/uploads/clip", resourceType: "video" });

    expect(apiResource).toHaveBeenCalledWith("bushart/uploads/clip", {
      resource_type: "video",
    });
  });
});

describe("verifyAssetOwnershipAll", () => {
  it("verifies a batch and reports every rejection grouped by reason", async () => {
    apiResource.mockImplementation(async (publicId: string) => {
      if (publicId.includes("ghost")) throw httpError(404);
      if (publicId.includes("foreign")) {
        return { public_id: publicId, asset_folder: "someone-else" };
      }
      return { public_id: publicId, asset_folder: "bushart/uploads" };
    });

    const result = await verifyAssetOwnershipAll([
      { publicId: "bushart/uploads/good", resourceType: "image" },
      { publicId: "bushart/uploads/ghost", resourceType: "image" },
      { publicId: "bushart/uploads/foreign-one", resourceType: "video" },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");

    expect(describeAssetRejections(result.rejected)).toEqual({
      missing: ["bushart/uploads/ghost"],
      foreign: ["bushart/uploads/foreign-one"],
    });
  });

  it("collapses duplicate ids so a repeated reference costs one Admin API call", async () => {
    apiResource.mockResolvedValue({ public_id: "x", asset_folder: "bushart/uploads" });

    const result = await verifyAssetOwnershipAll([
      { publicId: "bushart/uploads/a1b2", resourceType: "image" },
      { publicId: "bushart/uploads/a1b2", resourceType: "image" },
    ]);

    expect(result.ok).toBe(true);
    expect(apiResource).toHaveBeenCalledTimes(1);
  });

  // Same id, different resource type, is genuinely two Cloudinary resources.
  it("keeps distinct resource types separate when deduplicating", async () => {
    apiResource.mockResolvedValue({ public_id: "x", asset_folder: "bushart/uploads" });

    await verifyAssetOwnershipAll([
      { publicId: "bushart/uploads/a1b2", resourceType: "image" },
      { publicId: "bushart/uploads/a1b2", resourceType: "video" },
    ]);

    expect(apiResource).toHaveBeenCalledTimes(2);
  });

  it("returns the verified set when every asset is acceptable", async () => {
    apiResource.mockResolvedValue({ public_id: "x", asset_folder: "bushart/uploads" });

    const result = await verifyAssetOwnershipAll([
      { publicId: "bushart/uploads/a1b2", resourceType: "image" },
    ]);

    expect(result).toEqual({
      ok: true,
      verified: [{ publicId: "bushart/uploads/a1b2", resourceType: "image" }],
    });
  });
});