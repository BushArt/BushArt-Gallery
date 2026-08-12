import { describe, it, expect } from "vitest";
import { slugify, slugifyOrDefault } from "@/lib/utils/slugify";

describe("slugify", () => {
  it("lowercases and hyphenates text", () => {
    expect(slugify("Moth Study in Blue")).toBe("moth-study-in-blue");
  });

  it("strips special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("slugifyOrDefault falls back for empty input", () => {
    expect(slugifyOrDefault("!!!", "tag")).toBe("tag");
  });
});
