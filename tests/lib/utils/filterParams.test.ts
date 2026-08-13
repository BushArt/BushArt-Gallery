import { describe, it, expect } from "vitest";
import { filtersToSearchParams } from "@/lib/utils/filterParams";
import type { FilterState } from "@/hooks/useFilters";

const baseFilters: FilterState = {
  tags: [],
  year: null,
  medium: "",
  type: "",
  nsfw: "exclude",
  sort: "recent",
};

describe("filtersToSearchParams", () => {
  it("returns empty params for default filters", () => {
    const params = filtersToSearchParams(baseFilters);
    expect(params.toString()).toBe("nsfw=exclude");
  });

  it("serializes tags as comma-separated list", () => {
    const params = filtersToSearchParams({
      ...baseFilters,
      tags: ["nature", "portrait"],
    });
    expect(params.get("tags")).toBe("nature,portrait");
  });

  it("serializes year when set", () => {
    const params = filtersToSearchParams({ ...baseFilters, year: 2024 });
    expect(params.get("year")).toBe("2024");
  });

  it("serializes medium and type when non-empty", () => {
    const params = filtersToSearchParams({
      ...baseFilters,
      medium: "Gouache",
      type: "commission",
    });
    expect(params.get("medium")).toBe("Gouache");
    expect(params.get("type")).toBe("commission");
  });

  it("includes nsfw=include when visible", () => {
    const params = filtersToSearchParams({ ...baseFilters, nsfw: "include" });
    expect(params.get("nsfw")).toBe("include");
  });

  it("omits sort when recent (default)", () => {
    const params = filtersToSearchParams(baseFilters);
    expect(params.has("sort")).toBe(false);
  });

  it("includes sort when not recent", () => {
    const params = filtersToSearchParams({ ...baseFilters, sort: "oldest" });
    expect(params.get("sort")).toBe("oldest");
  });

  it("appends cursor when provided", () => {
    const params = filtersToSearchParams(baseFilters, "abc123");
    expect(params.get("cursor")).toBe("abc123");
  });
});
