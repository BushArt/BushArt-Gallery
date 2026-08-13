import { describe, it, expect } from "vitest";
import { parseYearParam, parseYearInput } from "@/lib/utils/parseYear";

describe("parseYearParam", () => {
  it("returns null for null input", () => {
    expect(parseYearParam(null)).toBeNull();
  });

  it("returns null for empty or whitespace-only strings", () => {
    expect(parseYearParam("")).toBeNull();
    expect(parseYearParam("   ")).toBeNull();
  });

  it("returns null for non-numeric strings", () => {
    expect(parseYearParam("abc")).toBeNull();
    expect(parseYearParam("20xx")).toBeNull();
  });

  it("returns null for Infinity and NaN", () => {
    expect(parseYearParam("Infinity")).toBeNull();
    expect(parseYearParam("NaN")).toBeNull();
  });

  it("parses valid integer years", () => {
    expect(parseYearParam("2024")).toBe(2024);
    expect(parseYearParam("  1999  ")).toBe(1999);
  });

  it("parses decimal numbers as finite values", () => {
    expect(parseYearParam("2024.5")).toBe(2024.5);
  });
});

describe("parseYearInput", () => {
  it("delegates to parseYearParam with same validation", () => {
    expect(parseYearInput("2023")).toBe(2023);
    expect(parseYearInput("")).toBeNull();
  });
});
