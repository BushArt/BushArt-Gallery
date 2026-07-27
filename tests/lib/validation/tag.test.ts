import { describe, it, expect } from "vitest";
import { TagSchema } from "@/lib/validation/tag";

describe("TagSchema", () => {
  it("accepts valid tag", () => {
    expect(() =>
      TagSchema.parse({
        id: "66a1e0a0c4d5e6f7a8b9c0aa",
        name: "Gouache",
        slug: "gouache",
        usageCount: 0,
        createdAt: "2026-04-02T18:00:00.000Z",
      }),
    ).not.toThrow();
  });

  it("rejects empty name", () => {
    expect(() => TagSchema.parse({ name: "", slug: "gouache" })).toThrow();
  });

  it("rejects name >40 chars", () => {
    expect(() => TagSchema.parse({ name: "x".repeat(41), slug: "gouache" })).toThrow();
  });

  it("rejects invalid slug characters", () => {
    expect(() => TagSchema.parse({ name: "Gouache", slug: "GOUCHE" })).toThrow();
  });

  it("requires usageCount", () => {
    expect(() =>
      TagSchema.parse({ name: "Gouache", slug: "gouache", createdAt: "2026-04-02T18:00:00.000Z" }),
    ).toThrow();
  });

  it("rejects non-integer usageCount", () => {
    expect(() =>
      TagSchema.parse({
        id: "66a1e0a0c4d5e6f7a8b9c0aa",
        name: "Gouache",
        slug: "gouache",
        usageCount: 1.5,
        createdAt: "2026-04-02T18:00:00.000Z",
      }),
    ).toThrow();
  });
});
