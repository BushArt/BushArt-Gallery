import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/models/artwork", () => ({
  findArtworkBySlug: vi.fn(),
}));

import { findArtworkBySlug } from "@/lib/db/models/artwork";
import {
  generateUniqueArtworkSlug,
  SlugGenerationError,
} from "@/lib/api/artwork-slug";

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

  // An unbounded while() over a saturated slug space would spin forever and
  // hold the request open; the loop must terminate with a typed error.
  it("throws SlugGenerationError instead of looping forever when every probe collides", async () => {
    mockedFind.mockResolvedValue({ slug: "taken" } as never);

    await expect(generateUniqueArtworkSlug("Moth Study")).rejects.toBeInstanceOf(
      SlugGenerationError,
    );
    expect(mockedFind).toHaveBeenCalledTimes(8);
  });

  it("probes a bounded number of times, giving up on a fresh suffix each round", async () => {
    mockedFind.mockResolvedValue({ slug: "taken" } as never);

    await expect(generateUniqueArtworkSlug("Moth Study")).rejects.toThrow(
      SlugGenerationError,
    );

    const probed = mockedFind.mock.calls.map(([candidate]) => candidate);
    expect(probed[0]).toBe("moth-study");
    expect(new Set(probed).size).toBe(probed.length);
  });

  it("recovers when a suffixed candidate is free", async () => {
    mockedFind
      .mockResolvedValueOnce({ slug: "moth-study" } as never)
      .mockResolvedValueOnce({ slug: "moth-study-abcd" } as never)
      .mockResolvedValueOnce(null);

    const slug = await generateUniqueArtworkSlug("Moth Study");
    expect(slug).toMatch(/^moth-study-[a-z0-9]{4}$/);
  });
});