import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/models/artwork", () => ({
  findArtworkBySlug: vi.fn(),
}));

import { findArtworkBySlug } from "@/lib/db/models/artwork";
import { generateUniqueArtworkSlug } from "@/lib/api/artwork-slug";

const mockedFind = vi.mocked(findArtworkBySlug);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateUniqueArtworkSlug", () => {
  it("returns slugified title when no collision", async () => {
    mockedFind.mockResolvedValueOnce(null);
    const slug = await generateUniqueArtworkSlug("Moth Study");
    expect(slug).toBe("moth-study");
    expect(mockedFind).toHaveBeenCalledWith("moth-study", true);
  });

  it("appends random suffix on collision", async () => {
    mockedFind
      .mockResolvedValueOnce({ slug: "moth-study" } as never)
      .mockResolvedValueOnce(null);
    const slug = await generateUniqueArtworkSlug("Moth Study");
    expect(slug).toMatch(/^moth-study-[a-z0-9]{4}$/);
  });

  it("uses default base slug for empty titles", async () => {
    mockedFind.mockResolvedValueOnce(null);
    const slug = await generateUniqueArtworkSlug("   ");
    expect(slug).toBe("artwork");
  });
});
