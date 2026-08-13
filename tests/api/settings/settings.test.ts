import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db/models/settings", () => ({
  findSettings: vi.fn(),
  upsertSettings: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/settings/route";
import { requireAdmin } from "@/lib/auth/guard";
import { findSettings, upsertSettings } from "@/lib/db/models/settings";

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty defaults when no settings document exists", async () => {
    vi.mocked(findSettings).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.artistName).toBe("");
    expect(json.socialLinks).toEqual([]);
    expect(json.tagline).toBeNull();
  });

  it("returns populated settings without url on image assets", async () => {
    vi.mocked(findSettings).mockResolvedValue({
      artistName: "Bush",
      tagline: "Gallery",
      biography: "Bio",
      profileImage: {
        publicId: "bushart/site/profile",
        url: "https://res.cloudinary.com/test/image/upload/profile",
        width: 800,
        height: 800,
        order: 0,
      },
      bannerImage: null,
      socialLinks: [{ platform: "Instagram", url: "https://instagram.com/example" }],
      contactEmail: "hello@example.com",
      contactUrl: null,
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    const res = await GET();
    const json = await res.json();
    expect(json.artistName).toBe("Bush");
    expect(json.profileImage).toEqual({
      publicId: "bushart/site/profile",
      width: 800,
      height: 800,
    });
    expect(json).not.toHaveProperty("updatedAt");
  });

  it("returns populated settings", async () => {
    vi.mocked(findSettings).mockResolvedValue({
      artistName: "Bush",
      tagline: "Gallery",
      biography: "Bio",
      profileImage: null,
      bannerImage: null,
      socialLinks: [{ platform: "Instagram", url: "https://instagram.com/example" }],
      contactEmail: "hello@example.com",
      contactUrl: null,
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    const res = await GET();
    const json = await res.json();
    expect(json.artistName).toBe("Bush");
    expect(json).not.toHaveProperty("updatedAt");
  });
});

describe("PATCH /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), { status: 401 }),
    );
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagline: "New" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("succeeds on zero-state first PATCH before any settings document exists", async () => {
    vi.mocked(findSettings).mockResolvedValue(null);
    vi.mocked(upsertSettings).mockResolvedValue({
      artistName: "Bush",
      tagline: "New tagline",
      biography: null,
      profileImage: null,
      bannerImage: null,
      socialLinks: [],
      contactEmail: null,
      contactUrl: null,
      updatedAt: "2026-06-01T00:00:00.000Z",
    });

    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistName: "Bush", tagline: "New tagline", socialLinks: [] }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tagline).toBe("New tagline");
    expect(upsertSettings).toHaveBeenCalledWith(
      expect.objectContaining({ artistName: "Bush", tagline: "New tagline" }),
    );
  });

  it("returns 400 when first PATCH omits artistName on zero-state", async () => {
    vi.mocked(findSettings).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagline: "New tagline", socialLinks: [] }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.field).toBe("artistName");
    expect(upsertSettings).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid email", async () => {
    const req = new NextRequest("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactEmail: "not-an-email" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
