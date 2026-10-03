import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

async function securityHeaderMap(): Promise<Map<string, string>> {
  const routes = await nextConfig.headers?.();
  expect(routes).toHaveLength(1);
  expect(routes?.[0]?.source).toBe("/:path*");
  return new Map((routes?.[0]?.headers ?? []).map(({ key, value }) => [key, value]));
}

describe("Next security headers", () => {
  it("applies baseline headers to the site and API paths", async () => {
    const values = await securityHeaderMap();

    expect(values.get("X-Frame-Options")).toBe("DENY");
    expect(values.get("X-Content-Type-Options")).toBe("nosniff");
    expect(values.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(values.get("Content-Security-Policy")).toContain("img-src 'self' data: blob: https://res.cloudinary.com");
    expect(values.get("Content-Security-Policy")).toContain("connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com");
  });

  it("sends HSTS from the app so the guarantee is deployment-independent", async () => {
    const values = await securityHeaderMap();
    expect(values.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
  });

  // The App Router streams inline `self.__next_f.push(...)` scripts that cannot
  // carry a hash or nonce under `cacheComponents: true`, so `'unsafe-inline'`
  // MUST stay in script-src or the page never hydrates (vercel/next.js#95353).
  // The XSS-relevant tightening this test guards is `'unsafe-eval'`, which must
  // stay absent outside development.
  it("keeps 'unsafe-inline' but omits 'unsafe-eval' from script-src", async () => {
    const values = await securityHeaderMap();
    const csp = values.get("Content-Security-Policy") ?? "";

    const scriptSrc = csp
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith("script-src"));

    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("locks down plugin embeds and framing", async () => {
    const values = await securityHeaderMap();
    const csp = values.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});