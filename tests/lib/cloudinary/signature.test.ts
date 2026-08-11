import { describe, it, expect, vi, beforeEach } from "vitest";
import { signUploadSignature, SignUploadSignatureParams, FolderValidationError } from "@/lib/cloudinary/signature";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockCloudinaryInstance = {
  utils: {
    api_sign_request: vi.fn(),
  },
  config: vi.fn(() => ({
    api_key: "test-key",
    cloud_name: "test-cloud",
    api_secret: "test-secret",
  })),
};

vi.mock("@/lib/cloudinary/client", () => ({
  getCloudinary: vi.fn(() => mockCloudinaryInstance),
  cloudinary: {},
  cloudName: "test-cloud",
  apiKey: "test-key",
}));

// ── Import after mock ───────────────────────────────────────────────────────

import { getCloudinary } from "@/lib/cloudinary/client";

// ── Helpers ────────────────────────────────────────────────────────────────

function mockSignature(signatureValue: string) {
  vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mockReturnValue(signatureValue);
}

const baseParams: SignUploadSignatureParams = {
  resourceType: "image",
  folder: "bushart/artworks/test",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("signUploadSignature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a valid signature payload for image uploads", async () => {
    mockSignature("abc123def456");

    const result = await signUploadSignature(baseParams);

    expect(result).toEqual({
      signature: "abc123def456",
      timestamp: expect.any(Number),
      apiKey: "test-key",
      cloudName: "test-cloud",
      folder: "bushart/artworks/test",
    });

    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.timestamp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));

    expect(mockCloudinaryInstance.utils.api_sign_request).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[1]).toBe("test-secret");
    expect(callArgs[0]).toHaveProperty("folder", "bushart/artworks/test");
    expect(callArgs[0]).toHaveProperty("timestamp", String(result.timestamp));
  });

  it("includes resource_type in signature for video uploads", async () => {
    mockSignature("videosig789");

    const result = await signUploadSignature({
      resourceType: "video",
      folder: "bushart/artworks/timelapse",
    });

    expect(result.signature).toBe("videosig789");
    expect(mockCloudinaryInstance.utils.api_sign_request).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[0]).toHaveProperty("resource_type", "video");
    expect(callArgs[0]).toHaveProperty("folder", "bushart/artworks/timelapse");
  });

  it("includes resource_type for raw uploads", async () => {
    mockSignature("rawsig012");

    const result = await signUploadSignature({
      resourceType: "raw",
      folder: "bushart/raw-assets",
    });

    expect(result.signature).toBe("rawsig012");
    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[0]).toHaveProperty("resource_type", "raw");
  });

  it("does not include resource_type for image uploads", async () => {
    mockSignature("imgsig345");

    await signUploadSignature(baseParams);

    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[0]).not.toHaveProperty("resource_type");
  });

  it("throws for folders outside the bushart/ namespace", async () => {
    const invalidFolders = [
      "artworks/test",
      "../etc/passwd",
      "uploads/images",
      "/absolute/path",
    ];

    for (const folder of invalidFolders) {
      await expect(
        signUploadSignature({
          resourceType: "image",
          folder,
        }),
      ).rejects.toThrow(`Invalid folder: must start with "bushart/", got "${folder}"`);
    }
  });

  it("passes the API secret to the SDK but never returns it", async () => {
    mockSignature("secretnotleaked");

    const result = await signUploadSignature(baseParams);

    expect(result).not.toHaveProperty("apiSecret");
    expect(result).not.toHaveProperty("secret");
    expect(Object.keys(result)).toEqual([
      "signature",
      "timestamp",
      "apiKey",
      "cloudName",
      "folder",
    ]);

    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[1]).toBe("test-secret");
  });

  it("throws FolderValidationError for invalid folders", async () => {
    await expect(
      signUploadSignature({
        resourceType: "image",
        folder: "not-bushart/test",
      }),
    ).rejects.toThrow(FolderValidationError);
  });

  it("returns a valid signature for mixed-case resource_type", async () => {
    mockSignature("mixedcasesig");

    const result = await signUploadSignature({
      resourceType: "video",
      folder: "bushart/artworks/test",
    });

    expect(result.signature).toBe("mixedcasesig");
    expect(mockCloudinaryInstance.utils.api_sign_request).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[0]).toHaveProperty("resource_type", "video");
  });

  it("returns undefined apiKey when CLOUDINARY_API_KEY is missing", async () => {
    const originalConfig = mockCloudinaryInstance.config;
    mockCloudinaryInstance.config = vi.fn(() => ({
      api_key: undefined,
      cloud_name: "test-cloud",
      api_secret: "test-secret",
    })) as any;

    const result = await signUploadSignature(baseParams);
    expect(result.apiKey).toBeUndefined();

    mockCloudinaryInstance.config = originalConfig;
  });

  it("returns undefined cloudName when CLOUDINARY_CLOUD_NAME is missing", async () => {
    const originalConfig = mockCloudinaryInstance.config;
    mockCloudinaryInstance.config = vi.fn(() => ({
      api_key: "test-key",
      cloud_name: undefined,
      api_secret: "test-secret",
    })) as any;

    const result = await signUploadSignature(baseParams);
    expect(result.cloudName).toBeUndefined();

    mockCloudinaryInstance.config = originalConfig;
  });
});
