import { describe, it, expect, vi } from "vitest";
import {
  getTransformationUrl,
  getTransformationParams,
  TransformationContext,
} from "@/lib/cloudinary/transformations";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/cloudinary/cloudName", () => ({
  resolveCloudName: () => "test-cloud",
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe("getTransformationParams", () => {
  it("returns f_auto,q_auto for every display context", () => {
    const displayContexts: TransformationContext[] = ["grid", "list", "popup", "fullscreen"];

    for (const context of displayContexts) {
      const params = getTransformationParams(context);
      expect(params).toContain("f_auto");
      expect(params).toContain("q_auto");
    }
  });

  it("returns the expected parameter string for each display context", () => {
    expect(getTransformationParams("grid")).toBe("w_400,h_400,c_fill,f_auto,q_auto");
    expect(getTransformationParams("list")).toBe("w_600,h_600,c_fill,f_auto,q_auto");
    expect(getTransformationParams("popup")).toBe("w_1200,h_1200,c_fill,f_auto,q_auto");
    expect(getTransformationParams("fullscreen")).toBe("w_1600,h_1600,c_fill,f_auto,q_auto");
  });

  it("returns fl_attachment for the download context", () => {
    expect(getTransformationParams("download")).toBe("fl_attachment");
  });

  it("does not apply f_auto,q_auto to the download context", () => {
    const params = getTransformationParams("download");
    expect(params).not.toContain("f_auto");
    expect(params).not.toContain("q_auto");
  });
});

describe("getTransformationUrl", () => {
  it("builds a full image URL with the cloud name and public id", () => {
    const url = getTransformationUrl("bushart/artworks/abc123", "grid");
    expect(url).toBe(
      "https://res.cloudinary.com/test-cloud/image/upload/w_400,h_400,c_fill,f_auto,q_auto/bushart/artworks/abc123",
    );
  });

  it("applies the correct transformation per context", () => {
    const url = getTransformationUrl("bushart/artworks/abc123", "fullscreen");
    expect(url).toContain("w_1600,h_1600,c_fill,f_auto,q_auto");
  });

  it("uses fl_attachment for the download context", () => {
    const url = getTransformationUrl("bushart/artworks/abc123", "download");
    expect(url).toContain("fl_attachment");
    expect(url).not.toContain("f_auto");
    expect(url).not.toContain("q_auto");
  });

  it("defaults to the image resource type", () => {
    const url = getTransformationUrl("bushart/artworks/abc123", "grid");
    expect(url).toContain("/image/upload/");
  });

  it("uses the video resource type for timelapse assets", () => {
    const url = getTransformationUrl("bushart/artworks/abc123/timelapse", "download", "video");
    expect(url).toBe(
      "https://res.cloudinary.com/test-cloud/video/upload/fl_attachment/bushart/artworks/abc123/timelapse",
    );
  });

  it("throws when the cloud name is not configured", async () => {
    // cloudName is a plain value export, not an indirection we can mutate at
    // call time, so re-import the module against a fresh mock for this case.
    vi.resetModules();
    vi.doMock("@/lib/cloudinary/cloudName", () => ({
      resolveCloudName: () => undefined,
    }));

    const { getTransformationUrl: getUrlWithoutCloudName } =
      await import("@/lib/cloudinary/transformations");

    expect(() => getUrlWithoutCloudName("bushart/artworks/abc123", "grid")).toThrow(
      "Missing Cloudinary cloud name. Set CLOUDINARY_CLOUD_NAME (server) or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (client).",
    );
  });
});
