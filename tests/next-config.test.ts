import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("Next security headers", () => {
  it("applies baseline headers to the site and API paths", async () => {
    const routes = await nextConfig.headers?.();
    expect(routes).toHaveLength(1);
    expect(routes?.[0]?.source).toBe("/:path*");

    const headers = routes?.[0]?.headers ?? [];
    const values = new Map(headers.map(({ key, value }) => [key, value]));

    expect(values.get("X-Frame-Options")).toBe("DENY");
    expect(values.get("X-Content-Type-Options")).toBe("nosniff");
    expect(values.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(values.get("Content-Security-Policy")).toContain("img-src 'self' data: blob: https://res.cloudinary.com");
    expect(values.get("Content-Security-Policy")).toContain("connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com");
  });
});
