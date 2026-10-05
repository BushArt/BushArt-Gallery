import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the mongodb module (no DB access needed, but required for module init)
vi.mock("@/lib/db/mongodb", () => ({
  getDb: async () => ({}),
  getClient: async () => ({}),
}));

// Mock auth guard
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
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    signUploadSignature: vi.fn(),
  };
});

import { POST } from "@/app/api/upload/signature/route";
import { requireAdmin } from "@/lib/auth/guard";
import {
  signUploadSignature,
  
} from "@/lib/cloudinary/signature";

function createSignatureRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/upload/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const fullSignatureResult = {
  signature: "sig",
  timestamp: 1751500000,
  apiKey: "key",
  cloudName: "cloud",
  folder: "bushart/uploads",
  allowedFormats: "jpg,jpeg,png,gif,webp,avif",
  maxFileSize: 50 * 1024 * 1024,
  overwrite: false,
  uniqueFilename: true,
};

describe("POST /api/upload/signature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAUTHENTICATED when requireAdmin throws", async () => {
    const mockError = new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHENTICATED",
          message: "No valid session",
          details: {},
        },
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

  it("succeeds when folder is omitted (the folder is server-fixed, not client-supplied)", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });
    vi.mocked(signUploadSignature).mockResolvedValue(fullSignatureResult);

    const req = createSignatureRequest({ resourceType: "image" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.folder).toBe("bushart/uploads");
  });

  it("returns 400 VALIDATION_ERROR on invalid JSON body", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });

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
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });

    const mockSignatureResult = { ...fullSignatureResult, signature: "abc123signature" };
    vi.mocked(signUploadSignature).mockResolvedValue(mockSignatureResult);

    const req = createSignatureRequest({ resourceType: "image" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockSignatureResult);
  });

  it("does not leak API secret in response", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });

    vi.mocked(signUploadSignature).mockResolvedValue(fullSignatureResult);

    const req = createSignatureRequest({ resourceType: "image" });
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
      "allowedFormats",
      "maxFileSize",
      "overwrite",
      "uniqueFilename",
    ]);
  });

  it("returns 500 INTERNAL_ERROR when signing fails unexpectedly", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });
    vi.mocked(signUploadSignature).mockRejectedValue(
      new Error("Signing failed"),
    );

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
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin1",
      username: "bush",
    });

    const mockSignatureResult = { ...fullSignatureResult, signature: "videosig" };
    vi.mocked(signUploadSignature).mockResolvedValue(mockSignatureResult);

    const req = createSignatureRequest({ resourceType: "video" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockSignatureResult);
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
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid token",
          details: {},
        },
      }),
      { status: 401 },
    );
    vi.mocked(requireAdmin).mockRejectedValue(mockError);

    const req = new NextRequest("http://localhost/api/upload/signature", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer not-a-real-jwt",
      },
      body: JSON.stringify({
        resourceType: "image",
        folder: "bushart/test",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});
