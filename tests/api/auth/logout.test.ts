import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("returns 200, clears the session cookie, and sets Cache-Control: no-store", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("bushart_session=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie!.toLowerCase()).toContain("samesite=lax");

    // Secure flag is environment-dependent
    const hasSecure = setCookie!.toLowerCase().includes("secure");
    if (process.env.NODE_ENV === "production") {
      expect(hasSecure).toBe(true);
    }
  });
});
