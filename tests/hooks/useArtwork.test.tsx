import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearArtworkDetailCache, cacheArtworkDetail } from "@/lib/utils/artworkDetailCache";
import type { ArtworkDetailResponse } from "@/types/api";
import { useArtwork } from "@/hooks/useArtwork";

const detail: ArtworkDetailResponse = {
  id: "65a1f2b3c4d5e6f7a8b9c0d1",
  slug: "test-art",
  title: "Test Art",
  description: null,
  medium: "Ink",
  type: "personal",
  nsfw: false,
  completionDate: "2026-01-01T00:00:00.000Z",
  images: [{ publicId: "img", url: "https://cdn.example.com/img", width: 100, height: 100, order: 0 }],
  timelapse: null,
  tags: [],
  featured: false,
  featuredOrder: null,
};

describe("useArtwork", () => {
  beforeEach(() => {
    clearArtworkDetailCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips fetch when initialData is provided", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useArtwork({ slug: "test-art", initialData: detail }),
    );

    expect(result.current.artwork).toEqual(detail);
    expect(result.current.isLoading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("seeds from detail cache before network fetch", async () => {
    cacheArtworkDetail(detail);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useArtwork({ slug: "test-art" }));

    expect(result.current.artwork).toEqual(detail);
    expect(result.current.isLoading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads artwork from API when no cache or initialData", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => detail,
      }),
    );

    const { result } = renderHook(() => useArtwork({ slug: "test-art" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.artwork).toEqual(detail);
  });

  it("sets error when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Not found" } }),
      }),
    );

    const { result } = renderHook(() => useArtwork({ slug: "missing" }));

    await waitFor(() => {
      expect(result.current.error).toBe("Not found");
    });
  });

  it("aborts in-flight fetch when slug changes", async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...detail, slug: "second-art", title: "Second" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ slug }) => useArtwork({ slug }),
      { initialProps: { slug: "test-art" } },
    );

    rerender({ slug: "second-art" });

    resolveFirst({
      ok: true,
      json: async () => detail,
    });

    await waitFor(() => {
      expect(result.current.artwork?.slug).toBe("second-art");
    });
  });
});
