import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

vi.mock("@/lib/auth/guard", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db/models/tag", () => ({
  listTags: vi.fn(),
  createTag: vi.fn(),
  findTagByNameInsensitive: vi.fn(),
  findTagBySlug: vi.fn(),
  deleteTag: vi.fn(),
}));

import { GET, POST } from "@/app/api/tags/route";
import { DELETE } from "@/app/api/tags/[id]/route";
import { requireAdmin } from "@/lib/auth/guard";
import {
  listTags,
  createTag,
  findTagByNameInsensitive,
  findTagBySlug,
  deleteTag,
} from "@/lib/db/models/tag";

const tagId = new ObjectId().toHexString();

describe("GET /api/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listTags).mockResolvedValue([
      { id: tagId, name: "Gouache", slug: "gouache", usageCount: 3, createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("returns master tag list", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].usageCount).toBe(3);
  });
});

describe("POST /api/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
    vi.mocked(findTagByNameInsensitive).mockResolvedValue(null);
    vi.mocked(findTagBySlug).mockResolvedValue(null);
    vi.mocked(createTag).mockResolvedValue({
      id: tagId,
      name: "Gouache",
      slug: "gouache",
      usageCount: 0,
      createdAt: "2026-06-01T00:00:00.000Z",
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHENTICATED" } }), { status: 401 }),
    );
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gouache" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 VALIDATION_ERROR for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 201 on create", async () => {
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gouache" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.slug).toBe("gouache");
  });

  it("returns 409 CONFLICT for case-insensitive duplicate name", async () => {
    vi.mocked(findTagByNameInsensitive).mockResolvedValue({
      id: tagId,
      name: "gouache",
      slug: "gouache",
      usageCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gouache" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
    expect(createTag).not.toHaveBeenCalled();
  });

  it("returns 409 CONFLICT when slug already exists", async () => {
    vi.mocked(findTagBySlug).mockResolvedValue({
      id: tagId,
      name: "Existing",
      slug: "gouache",
      usageCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const req = new NextRequest("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gouache" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(createTag).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/tags/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "admin1", username: "bush" });
    vi.mocked(deleteTag).mockResolvedValue(true);
  });

  it("returns 200 on cascading delete", async () => {
    const req = new NextRequest(`http://localhost/api/tags/${tagId}`, { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: tagId }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ deleted: true, id: tagId });
    expect(deleteTag).toHaveBeenCalledWith(tagId);
  });

  it("returns 404 when tag not found", async () => {
    vi.mocked(deleteTag).mockResolvedValue(false);
    const req = new NextRequest(`http://localhost/api/tags/${tagId}`, { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: tagId }) });
    expect(res.status).toBe(404);
  });
});
