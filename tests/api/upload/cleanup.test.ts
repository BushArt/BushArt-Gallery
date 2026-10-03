import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createJsonRequest } from "../../helpers";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/cloudinary/destroy", () => ({
  destroyAssets: vi.fn(async () => undefined),
}));

import { DELETE } from "@/app/api/upload/cleanup/route";
import { requireAdmin } from "@/lib/auth/guard";
import { destroyAssets } from "@/lib/cloudinary/destroy";

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockDestroy = vi.mocked(destroyAssets);

const cleanupUrl = "http://localhost/api/upload/cleanup";

function body(assets: Array<{ publicId: string; resourceType: "image" | "video" }>) {
  return createJsonRequest("DELETE", cleanupUrl, { assets });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ id: "admin1", username: "bush" });
  mockDestroy.mockResolvedValue(undefined);
});

describe("DELETE /api/upload/cleanup", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockRejectedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), {
        status: 401,
      }),
    );

    const res = await DELETE(
      body([{ publicId: "bushart/uploads/a1", resourceType: "image" }]),
    );

    expect(res.status).toBe(401);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("destroys the supplied assets", async () => {
    const res = await DELETE(
      body([
        { publicId: "bushart/uploads/a1", resourceType: "image" },
        { publicId: "bushart/uploads/clip", resourceType: "video" },
      ]),
    );

    expect(res.status).toBe(200);
    expect(mockDestroy).toHaveBeenCalledWith([
      { publicId: "bushart/uploads/a1", resourceType: "image" },
      { publicId: "bushart/uploads/clip", resourceType: "video" },
    ]);
    expect(await res.json()).toEqual({ destroyed: 2 });
  });

  // Without the namespace check, an admin session could delete assets belonging
  // to another tenant sharing the same Cloudinary cloud.
  it("rejects publicIds outside the bushart/ namespace without destroying anything", async () => {
    const res = await DELETE(
      body([{ publicId: "other-tenant/secret", resourceType: "image" }]),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.foreign).toEqual(["other-tenant/secret"]);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("rejects an empty asset list", async () => {
    const res = await DELETE(body([]));
    expect(res.status).toBe(400);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("bounds the batch so one request cannot fan out unbounded destroys", async () => {
    const assets = Array.from({ length: 26 }, (_, i) => ({
      publicId: `bushart/uploads/a${i}`,
      resourceType: "image" as const,
    }));

    const res = await DELETE(body(assets));

    expect(res.status).toBe(400);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("rejects an unknown resourceType", async () => {
    const res = await DELETE(
      createJsonRequest("DELETE", cleanupUrl, {
        assets: [{ publicId: "bushart/uploads/a1", resourceType: "raw" }],
      }),
    );

    expect(res.status).toBe(400);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const res = await DELETE(
      new NextRequest(cleanupUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("deduplicates repeated ids before destroying", async () => {
    await DELETE(
      body([
        { publicId: "bushart/uploads/a1", resourceType: "image" },
        { publicId: "bushart/uploads/a1", resourceType: "image" },
      ]),
    );

    expect(mockDestroy).toHaveBeenCalledWith([
      { publicId: "bushart/uploads/a1", resourceType: "image" },
    ]);
  });

  it("returns 503 when Cloudinary destroy fails so cleanup is reconcilable", async () => {
    mockDestroy.mockRejectedValue(new Error("Cloudinary down"));

    const res = await DELETE(
      body([{ publicId: "bushart/uploads/a1", resourceType: "image" }]),
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("SERVICE_UNAVAILABLE");
  });
});