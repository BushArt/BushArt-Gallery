import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useArtworks } from "@/hooks/useArtworks";
import type { FilterState } from "@/hooks/useFilters";

const baseFilters: FilterState = {
  tags: [],
  year: null,
  medium: "",
  type: "",
  nsfw: "exclude",
  sort: "recent",
};

const page1Response = {
  items: [{ id: "a1", slug: "art-1", title: "Art 1" }],
  nextCursor: "cursor-page-2",
  hasMore: true,
};

const page2Response = {
  items: [{ id: "a2", slug: "art-2", title: "Art 2" }],
  nextCursor: null,
  hasMore: false,
};

describe("useArtworks", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => page1Response,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not load more with stale cursor while initial fetch is in flight", async () => {
    let resolveFirst: (value: unknown) => void;
    const firstFetch = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("cursor=cursor-page-2")) {
        throw new Error("Stale cursor fetch should not happen during filter refetch");
      }
      if (!url.includes("cursor=")) {
        return firstFetch.then(() => ({
          ok: true,
          json: async () => page1Response,
        })) as Promise<Response>;
      }
      return Promise.resolve({
        ok: true,
        json: async () => page2Response,
      }) as Promise<Response>;
    });

    const { result, rerender } = renderHook(
      ({ filters }) => useArtworks({ filters }),
      { initialProps: { filters: baseFilters } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    act(() => {
      result.current.loadMore();
    });

    act(() => {
      resolveFirst!({
        ok: true,
        json: async () => page1Response,
      });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("cursor=cursor-page-2"),
    );

    rerender({ filters: { ...baseFilters, year: 2023 } });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const cursorCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => String(url).includes("cursor="));
    expect(cursorCalls).toHaveLength(0);
  });

  it("marks network errors as retryable", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useArtworks({ filters: baseFilters }));

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isRetryable).toBe(true);
  });

  it("marks 4xx errors as non-retryable", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Bad request" } }),
    } as Response);

    const { result } = renderHook(() => useArtworks({ filters: baseFilters }));

    await waitFor(() => expect(result.current.error).toBe("Bad request"));
    expect(result.current.isRetryable).toBe(false);
  });
});
