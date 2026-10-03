import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";

const mockCookies = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

const findArtworkBySlug = vi.fn();

vi.mock("@/lib/db/models/artwork", () => ({
  findArtworkBySlug: (...args: unknown[]) => findArtworkBySlug(...args),
}));

vi.mock("@/lib/db/models/tag", () => ({
  findTagsByIds: vi.fn(async () => []),
}));

vi.mock("@/lib/auth/jwt", () => ({
  verifyToken: vi.fn((token: string) =>
    token === "valid-token"
      ? { id: "admin1", username: "bush", jti: "j", tokenVersion: 1 }
      : null,
  ),
}));

vi.mock("@/lib/db/models/admin", () => ({
  findByUsername: vi.fn(async (username: string) =>
    username === "bush"
      ? {
          id: "admin1",
          username: "bush",
          failedLoginAttempts: 0,
          lockUntil: null,
          lastLoginAt: null,
          tokenVersion: 1,
          createdAt: new Date(),
        }
      : null,
  ),
}));

import { generateMetadata } from "@/app/artwork/[slug]/page";

process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test";

const nsfwArtwork = {
  id: "65a1f2b3c4d5e6f7a8b9c0d1",
  slug: "private-study",
  title: "Private Study",
  description: "Sensitive description of the artwork",
  medium: "Oil",
  type: "personal" as const,
  nsfw: true,
  featured: false,
  featuredOrder: null,
  images: [
    {
      publicId: "bushart/uploads/nsfw-cover",
      url: "https://res.cloudinary.com/test/image/upload/nsfw-cover",
      width: 800,
      height: 600,
      order: 0,
    },
  ],
  timelapse: null,
  tagIds: [],
  completionDate: "2026-06-30T00:00:00.000Z",
  colorPalette: null,
  createdAt: "2026-06-30T00:00:00.000Z",
  updatedAt: "2026-06-30T00:00:00.000Z",
};

const safeArtwork = { ...nsfwArtwork, slug: "moth-study", title: "Moth Study", nsfw: false };

function params(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function withSession(token?: string) {
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === "bushart_session" && token ? { value: token } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  withSession(undefined);
});

describe("generateMetadata — NSFW gating", () => {
  // Crawlers and link previews are unauthenticated, so a real title or OG
  // image here would reproduce the artwork on third-party surfaces before the
  // in-app consent interstitial ever runs.
  it("returns a placeholder with no OG image for NSFW artwork requested anonymously", async () => {
    findArtworkBySlug.mockResolvedValue(nsfwArtwork);

    const meta = await generateMetadata(params("private-study"));

    expect(findArtworkBySlug).toHaveBeenCalledWith("private-study", true);
    expect(meta.title).toBe("Artwork — BushArt");
    expect(meta.openGraph?.images).toBeUndefined();
  });

  it("leaks no NSFW title, description, or image into the serialized metadata", async () => {
    findArtworkBySlug.mockResolvedValue(nsfwArtwork);

    const meta = await generateMetadata(params("private-study"));
    const serialized = JSON.stringify(meta);

    expect(serialized).not.toContain("Private Study");
    expect(serialized).not.toContain("Sensitive description");
    expect(serialized).not.toContain("nsfw-cover");
    expect(serialized).not.toContain("res.cloudinary.com");
  });

  it("returns 404-style metadata rather than a placeholder for a genuinely missing slug", async () => {
    findArtworkBySlug.mockResolvedValue(null);

    const meta = await generateMetadata(params("does-not-exist"));

    expect(meta.title).toBe("Artwork not found — BushArt");
  });

  it("serves the real metadata and OG image for a safe artwork anonymously", async () => {
    findArtworkBySlug.mockResolvedValue(safeArtwork);

    const meta = await generateMetadata(params("moth-study"));

    expect(meta.title).toBe("Moth Study — BushArt");
    const ogImages = meta.openGraph?.images;
    const firstOgImage = Array.isArray(ogImages) ? ogImages[0] : ogImages;
    expect(firstOgImage).toMatchObject({
      url: expect.stringContaining("bushart/uploads/nsfw-cover"),
    });
    expect(meta.robots).toBeUndefined();
  });

  it("resolves NSFW metadata for a verified admin session", async () => {
    withSession("valid-token");
    findArtworkBySlug.mockResolvedValue(nsfwArtwork);

    const meta = await generateMetadata(params("private-study"));

    expect(findArtworkBySlug).toHaveBeenCalledWith("private-study", true);
    expect(meta.title).toBe("Private Study — BushArt");
    // Even for an admin, the page must not be indexed.
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("ignores an invalid session token and stays on the public path", async () => {
    withSession("tampered-token");
    findArtworkBySlug.mockResolvedValue(nsfwArtwork);

    const meta = await generateMetadata(params("private-study"));

    // Treated as anonymous: placeholder, no real title or OG image.
    expect(meta.title).toBe("Artwork — BushArt");
    expect(meta.openGraph?.images).toBeUndefined();
  });

  // A thrown auth check must degrade to the public view, never leak content.
  it("falls back to the public view when the session lookup throws", async () => {
    mockCookies.mockRejectedValue(new Error("cookies unavailable"));
    findArtworkBySlug.mockResolvedValue(nsfwArtwork);

    const meta = await generateMetadata(params("private-study"));

    expect(meta.title).toBe("Artwork — BushArt");
    expect(meta.openGraph?.images).toBeUndefined();
  });

  it("marks a safe artwork as indexable and omits the robots override", async () => {
    findArtworkBySlug.mockResolvedValue(safeArtwork);

    const meta = await generateMetadata(params("moth-study"));

    expect(meta.robots).toBeUndefined();
  });
});

// Confirms the module under test reads cookies via next/headers, not a
// Route-Handler-only NextRequest.
describe("generateMetadata — session source", () => {
  it("reads the session through next/headers", async () => {
    findArtworkBySlug.mockResolvedValue(safeArtwork);

    await generateMetadata(params("moth-study"));

    expect(mockCookies).toHaveBeenCalled();
    expect(cookies).toBeDefined();
  });
});