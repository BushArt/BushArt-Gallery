import { describe, it, expect, vi, beforeEach } from "vitest";

describe("lib/db/mongodb", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("getClient throws a clear error when MONGODB_URI is missing", async () => {
    process.env.MONGODB_URI = "";

    const { getClient } = await import("@/lib/db/mongodb");
    await expect(getClient()).rejects.toThrow(/Missing MONGODB_URI/);
  });
});