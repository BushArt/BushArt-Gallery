import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NSFW_STORAGE_KEY, useFilters } from "@/hooks/useFilters";

const replaceMock = vi.fn();
let searchParams = new URLSearchParams("nsfw=exclude");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/",
  useSearchParams: () => searchParams,
}));

describe("useFilters", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    searchParams = new URLSearchParams("nsfw=exclude");
    localStorage.clear();
  });

  it("updates URL via router.replace when filters change", () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.setFilters({ year: 2023, tags: ["portrait"] });
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/?tags=portrait&year=2023&nsfw=exclude",
      { scroll: false },
    );
  });

  it("persists NSFW preference to localStorage", () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.setFilters({ nsfw: "include" });
    });

    expect(localStorage.getItem(NSFW_STORAGE_KEY)).toBe("include");
    expect(replaceMock).toHaveBeenCalledWith("/?nsfw=include", { scroll: false });
  });

  it("uses URL nsfw param when present over localStorage default", () => {
    localStorage.setItem(NSFW_STORAGE_KEY, "include");
    searchParams = new URLSearchParams("nsfw=exclude");

    const { result } = renderHook(() => useFilters());

    expect(result.current.filters.nsfw).toBe("exclude");
  });

  it("parses invalid year URL param as null", () => {
    searchParams = new URLSearchParams("year=abc&nsfw=exclude");

    const { result } = renderHook(() => useFilters());

    expect(result.current.filters.year).toBeNull();
  });

  it("bootstraps NSFW from localStorage when URL has no nsfw param", () => {
    localStorage.setItem(NSFW_STORAGE_KEY, "include");
    searchParams = new URLSearchParams("");

    renderHook(() => useFilters());

    expect(replaceMock).toHaveBeenCalledWith("/?nsfw=include", { scroll: false });
  });
});
