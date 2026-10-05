import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadFileToCloudinary } from "@/lib/cloudinary/uploadClient";
import type { UploadSignatureResponse } from "@/lib/cloudinary/uploadClient";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

/** Signature payload the server returns, mirroring `signUploadSignature`. */
function signatureResponse(
  overrides: Partial<UploadSignatureResponse> = {},
): UploadSignatureResponse {
  return {
    signature: "sig",
    timestamp: 1751500000,
    apiKey: "key",
    cloudName: "cloud",
    folder: "bushart/uploads",
    allowedFormats: "jpg,jpeg,png,gif,webp,avif",
    maxFileSize: 50 * 1024 * 1024,
    overwrite: false,
    uniqueFilename: true,
    ...overrides,
  };
}

function mockSignatureEndpoint(payload: UploadSignatureResponse) {
  mockFetch.mockImplementationOnce(async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

/** The Cloudinary upload call is the second fetch; return a successful upload. */
function mockUploadEndpoint() {
  mockFetch.mockImplementationOnce(async () =>
    new Response(
      JSON.stringify({
        public_id: "bushart/uploads/abc",
        secure_url: "https://res.cloudinary.com/cloud/image/upload/bushart/uploads/abc.jpg",
        width: 100,
        height: 100,
        resource_type: "image",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

/** Read the FormData the client sent to Cloudinary. */
function sentFormData(): FormData {
  const call = mockFetch.mock.calls[1];
  const body = call?.[1]?.body;
  expect(body).toBeInstanceOf(FormData);
  return body as FormData;
}

function file(): File {
  return new File(["binary"], "artwork.jpg", { type: "image/jpeg" });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("uploadFileToCloudinary", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Stubbed per-test rather than at module scope so it cannot be undone by
    // a sibling suite's `unstubAllGlobals`.
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("echoes back every signed parameter for an image upload", async () => {
    mockSignatureEndpoint(signatureResponse());
    mockUploadEndpoint();

    await uploadFileToCloudinary(file(), "image");

    const form = sentFormData();
    // Each of these was part of `signableParams`; omitting any one makes
    // Cloudinary recompute a different signature and reject the upload.
    expect(form.get("api_key")).toBe("key");
    expect(form.get("timestamp")).toBe("1751500000");
    expect(form.get("signature")).toBe("sig");
    expect(form.get("folder")).toBe("bushart/uploads");
    expect(form.get("allowed_formats")).toBe("jpg,jpeg,png,gif,webp,avif");
    expect(form.get("max_file_size")).toBe(String(50 * 1024 * 1024));
    expect(form.get("overwrite")).toBe("false");
    expect(form.get("unique_filename")).toBe("true");
  });

  it("does not send resource_type for image uploads (it is not signed)", async () => {
    mockSignatureEndpoint(signatureResponse());
    mockUploadEndpoint();

    await uploadFileToCloudinary(file(), "image");

    // Adding an unsigned parameter would change the parameter set and break the
    // signature just as surely as omitting a signed one.
    expect(sentFormData().has("resource_type")).toBe(false);
  });

  it("echoes resource_type for video uploads, where it is signed", async () => {
    mockSignatureEndpoint(
      signatureResponse({
        allowedFormats: "mp4,mov,webm",
        resourceType: "video",
      }),
    );
    mockFetch.mockImplementationOnce(async () =>
      new Response(
        JSON.stringify({
          public_id: "bushart/uploads/clip",
          secure_url: "https://res.cloudinary.com/cloud/video/upload/bushart/uploads/clip.mp4",
          width: 100,
          height: 100,
          duration: 12.5,
          resource_type: "video",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await uploadFileToCloudinary(file(), "video");

    const form = sentFormData();
    expect(form.get("resource_type")).toBe("video");
    expect(form.get("allowed_formats")).toBe("mp4,mov,webm");
    expect(result.duration).toBe(12.5);
  });

  it("posts to the resource-type-specific Cloudinary endpoint", async () => {
    mockSignatureEndpoint(signatureResponse({ resourceType: "video" }));
    mockFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ public_id: "x", secure_url: "y", width: 1, height: 1, resource_type: "video" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await uploadFileToCloudinary(file(), "video");

    expect(mockFetch.mock.calls[1]?.[0]).toBe("https://api.cloudinary.com/v1_1/cloud/video/upload");
  });

  it("surfaces the server error message when the signature request fails", async () => {
    mockFetch.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ error: { message: "Nope" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await expect(uploadFileToCloudinary(file(), "image")).rejects.toThrow("Nope");
  });

  it("surfaces the Cloudinary status when the upload itself fails", async () => {
    mockSignatureEndpoint(signatureResponse());
    mockFetch.mockImplementationOnce(async () => new Response("nope", { status: 400 }));

    await expect(uploadFileToCloudinary(file(), "image")).rejects.toThrow(
      "Cloudinary upload failed (400)",
    );
  });
});