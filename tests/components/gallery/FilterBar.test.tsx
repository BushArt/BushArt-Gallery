import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FilterBar, parseYearInput } from "@/components/gallery/FilterBar";
import { buildQueryString } from "@/hooks/useArtworks";
import type { FilterState } from "@/hooks/useFilters";

const baseFilters: FilterState = {
  tags: [],
  year: null,
  medium: "",
  type: "",
  nsfw: "exclude",
  sort: "recent",
};

const tags = [
  { id: "t1", name: "Portrait", slug: "portrait", usageCount: 2, createdAt: "2024-01-01T00:00:00.000Z" },
];

describe("FilterBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces year filter and emits valid year after delay", () => {
    const onFiltersChange = vi.fn();

    render(
      <FilterBar filters={baseFilters} tags={tags} onFiltersChange={onFiltersChange} />,
    );

    fireEvent.change(screen.getByTestId("filter-year"), { target: { value: "2023" } });
    expect(onFiltersChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenCalledWith({ year: 2023 });
  });

  it("parseYearInput rejects invalid values", () => {
    expect(parseYearInput("abc")).toBeNull();
    expect(parseYearInput("2023")).toBe(2023);
    expect(parseYearInput("")).toBeNull();
  });

  it("buildQueryString reflects filter state for API requests", () => {
    const filters: FilterState = {
      tags: ["portrait"],
      year: 2023,
      medium: "Ink",
      type: "commission",
      nsfw: "include",
      sort: "oldest",
    };

    const qs = buildQueryString(filters);
    const params = new URLSearchParams(qs);

    expect(params.get("tags")).toBe("portrait");
    expect(params.get("year")).toBe("2023");
    expect(params.get("medium")).toBe("Ink");
    expect(params.get("type")).toBe("commission");
    expect(params.get("nsfw")).toBe("include");
    expect(params.get("sort")).toBe("oldest");
  });
});
