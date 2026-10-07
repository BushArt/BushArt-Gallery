import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signUploadSignature,
  SignUploadSignatureParams,
  IMAGE_ALLOWED_FORMATS,
  VIDEO_ALLOWED_FORMATS,
  UPLOAD_FOLDER,
  UPLOAD_MAX_FILE_SIZE,
} from "@/lib/cloudinary/signature";

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

// ── Helpers ────────────────────────────────────────────────────────────────

function mockSignature(signatureValue: string) {
  vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mockReturnValue(signatureValue);
}

const baseParams: SignUploadSignatureParams = {
  resourceType: "image",
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
      folder: UPLOAD_FOLDER,
      allowedFormats: IMAGE_ALLOWED_FORMATS,
      maxFileSize: UPLOAD_MAX_FILE_SIZE,
      overwrite: false,
      uniqueFilename: true,
    });

    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.timestamp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));

    expect(mockCloudinaryInstance.utils.api_sign_request).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[1]).toBe("test-secret");
    expect(callArgs[0]).toHaveProperty("folder", UPLOAD_FOLDER);
    expect(callArgs[0]).toHaveProperty("timestamp", String(result.timestamp));
    // Every signed field must be returned so the client can echo it back, or
    // Cloudinary recomputes a different signature and rejects the upload.
    // NOTE: max_file_size is NOT signed (Cloudinary excludes it from verification)
    // but IS returned so the client sends it for server-side validation.
    expect(callArgs[0]).toHaveProperty("allowed_formats", IMAGE_ALLOWED_FORMATS);
    expect(callArgs[0]).not.toHaveProperty("max_file_size");
    expect(callArgs[0]).toHaveProperty("overwrite", "false");
    expect(callArgs[0]).toHaveProperty("unique_filename", "true");
  });

  it("includes resource_type and the video allow-list for video uploads", async () => {
    mockSignature("videosig789");

    const result = await signUploadSignature({ resourceType: "video" });

    expect(result.signature).toBe("videosig789");
    expect(result.folder).toBe(UPLOAD_FOLDER);
    expect(result.allowedFormats).toBe(VIDEO_ALLOWED_FORMATS);
    expect(mockCloudinaryInstance.utils.api_sign_request).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[0]).toHaveProperty("resource_type", "video");
    expect(callArgs[0]).toHaveProperty("folder", UPLOAD_FOLDER);
    expect(callArgs[0]).toHaveProperty("allowed_formats", VIDEO_ALLOWED_FORMATS);
  });

  it("ignores any client-supplied folder and always signs the fixed upload folder", async () => {
    mockSignature("fixedfoldersig");

    const result = await signUploadSignature({
      resourceType: "image",
      folder: "evil.com/",
    } as never);

    expect(result.folder).toBe(UPLOAD_FOLDER);
    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[0]).toHaveProperty("folder", UPLOAD_FOLDER);
  });

  it("does not include resource_type for image uploads", async () => {
    mockSignature("imgsig345");

    await signUploadSignature(baseParams);

    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[0]).not.toHaveProperty("resource_type");
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
      "allowedFormats",
      "maxFileSize",
      "overwrite",
      "uniqueFilename",
    ]);

    const callArgs = vi.mocked(mockCloudinaryInstance.utils.api_sign_request).mock.calls[0];
    expect(callArgs[1]).toBe("test-secret");
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
