import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(),
}));

// Prevent cloudinary client module initialization from throwing when env vars are missing
vi.mock("@/lib/cloudinary/client", () => ({
  getCloudinary: vi.fn(() => ({
    config: () => ({}),
    utils: { api_sign_request: () => "sig" },
  })),
  cloudinary: { config: () => ({}), utils: { api_sign_request: () => "sig" } },
  cloudName: "test-cloud",
  apiKey: "test-key",
}));

// @ts-ignore - cast needed for spread of importActual return
vi.mock("@/lib/cloudinary/signature", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    signUploadSignature: vi.fn(),
  };
});

// ── Import after mocks ─────────────────────────────────────────────────────

import { POST } from "@/app/api/upload/signature/route";
import { requireAdmin } from "@/lib/auth/guard";
import { signUploadSignature, FolderValidationError } from "@/lib/cloudinary/signature";

// ── Helpers ────────────────────────────────────────────────────────────────

function createSignatureRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/upload/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/upload/signature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAUTHENTICATED when requireAdmin throws", async () => {
    const mockError = new Response(
      JSON.stringify({
        error: { code: "UNAUTHENTICATED", message: "No valid session", details: {} },
      }),
      { status: 401 },
    );
    vi.mocked(requireAdmin).mockRejectedValue(mockError);

    const req = createSignatureRequest({
      resourceType: "image",
      folder: "bushart/artworks/test",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 400 VALIDATION_ERROR when body is missing folder", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });

    const req = createSignatureRequest({ resourceType: "image" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR on invalid JSON body", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });

    const req = new NextRequest("http://localhost/api/upload/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with signature payload for valid authenticated request", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });

    const mockSignatureResult = {
      signature: "abc123signature",
      timestamp: 1751500000,
      apiKey: "142857396215",
      cloudName: "bushart",
      folder: "bushart/artworks/test",
    };
    vi.mocked(signUploadSignature).mockResolvedValue(mockSignatureResult);

    const req = createSignatureRequest({
      resourceType: "image",
      folder: "bushart/artworks/test",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockSignatureResult);
    expect(json).not.toHaveProperty("apiSecret");
  });

  it("returns 200 with signature for video resource type", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });

    const mockSignatureResult = {
      signature: "videosig",
      timestamp: 1751500000,
      apiKey: "142857396215",
      cloudName: "bushart",
      folder: "bushart/artworks/timelapse",
    };
    vi.mocked(signUploadSignature).mockResolvedValue(mockSignatureResult);

    const req = createSignatureRequest({
      resourceType: "video",
      folder: "bushart/artworks/timelapse",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockSignatureResult);
  });

  it("returns 200 with signature for raw resource type", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });

    const mockSignatureResult = {
      signature: "rawsig",
      timestamp: 1751500000,
      apiKey: "142857396215",
      cloudName: "bushart",
      folder: "bushart/raw-assets",
    };
    vi.mocked(signUploadSignature).mockResolvedValue(mockSignatureResult);

    const req = createSignatureRequest({
      resourceType: "raw",
      folder: "bushart/raw-assets",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockSignatureResult);
  });

  it("ensures CLOUDINARY_API_SECRET is never present in response", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
    vi.mocked(signUploadSignature).mockResolvedValue({
      signature: "sig",
      timestamp: 1000,
      apiKey: "key",
      cloudName: "cloud",
      folder: "bushart/test",
    });

    const req = createSignatureRequest({
      resourceType: "image",
      folder: "bushart/test",
    });
    const res = await POST(req);
    const json = await res.json();
    const responseText = JSON.stringify(json);
    expect(responseText).not.toContain("CLOUDINARY_API_SECRET");
    expect(responseText).not.toContain("api_secret");
    expect(Object.keys(json)).toEqual([
      "signature",
      "timestamp",
      "apiKey",
      "cloudName",
      "folder",
    ]);
  });

  it("returns 500 INTERNAL_ERROR when signing fails unexpectedly", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
    vi.mocked(signUploadSignature).mockRejectedValue(new Error("Signing failed"));

    const req = createSignatureRequest({
      resourceType: "image",
      folder: "bushart/test",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });

  it("includes resource_type in signature for video uploads", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });

    const mockSignatureResult = {
      signature: "videosig",
      timestamp: 1751500000,
      apiKey: "142857396215",
      cloudName: "bushart",
      folder: "bushart/artworks/timelapse",
    };
    vi.mocked(signUploadSignature).mockResolvedValue(mockSignatureResult);

    const req = createSignatureRequest({
      resourceType: "video",
      folder: "bushart/artworks/timelapse",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockSignatureResult);
  });

  it("returns 400 VALIDATION_ERROR when folder validation fails (path traversal attempt)", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
    const folderError = new FolderValidationError("../etc/passwd");
    vi.mocked(signUploadSignature).mockRejectedValue(folderError);

    const req = createSignatureRequest({
      resourceType: "image",
      folder: "../etc/passwd",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toContain("bushart/");
  });

  it("returns 423 LOCKOUT when admin account is locked", async () => {
    const mockError = new Response(
      JSON.stringify({
        error: { code: "LOCKED", message: "Account locked", details: {} },
      }),
      { status: 423 },
    );
    vi.mocked(requireAdmin).mockRejectedValue(mockError);

    const req = createSignatureRequest({
      resourceType: "image",
      folder: "bushart/test",
    });
    const res = await POST(req);
    expect(res.status).toBe(423);
    const json = await res.json();
    expect(json.error.code).toBe("LOCKED");
  });

  it("returns 401 UNAUTHENTICATED when Authorization header is malformed", async () => {
    const mockError = new Response(
      JSON.stringify({
        error: { code: "UNAUTHENTICATED", message: "Invalid token", details: {} },
      }),
      { status: 401 },
    );
    vi.mocked(requireAdmin).mockRejectedValue(mockError);

    const req = new NextRequest("http://localhost/api/upload/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer not-a-real-jwt" },
      body: JSON.stringify({ resourceType: "image", folder: "bushart/test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});
