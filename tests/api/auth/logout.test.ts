import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/jwt", () => ({
  verifyToken: vi.fn(() => ({
    id: "admin1",
    username: "bush",
    jti: "jti-1",
    tokenVersion: 0,
  })),
}));

vi.mock("@/lib/db/models/admin", () => ({
  getAdminByUsername: vi.fn(async () => ({
    id: "admin1",
    username: "bush",
    tokenVersion: 0,
  })),
  incrementTokenVersion: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/auth/logout/route";
import { verifyToken } from "@/lib/auth/jwt";
import { getAdminByUsername, incrementTokenVersion } from "@/lib/db/models/admin";

function createLogoutRequest(cookieValue?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/auth/logout", {
    method: "POST",
  });
  if (cookieValue !== undefined) {
    req.cookies.set("bushart_session", cookieValue);
  }
  return req;
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200, clears the session cookie, and sets Cache-Control: no-store", async () => {
    const res = await POST(createLogoutRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("bushart_session=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie!.toLowerCase()).toContain("samesite=lax");

    const hasSecure = setCookie!.toLowerCase().includes("secure");
    if (process.env.NODE_ENV === "production") {
      expect(hasSecure).toBe(true);
    }
  });

  it("increments the admin's tokenVersion so the presented token is revoked", async () => {
    const res = await POST(createLogoutRequest("valid-token"));

    expect(res.status).toBe(200);
    expect(verifyToken).toHaveBeenCalledWith("valid-token");
    expect(getAdminByUsername).toHaveBeenCalledWith("bush");
    expect(incrementTokenVersion).toHaveBeenCalledWith("admin1");
  });

  it("still clears the cookie when the token is invalid", async () => {
    vi.mocked(verifyToken).mockReturnValueOnce(null);

    const res = await POST(createLogoutRequest("bogus"));

    expect(res.status).toBe(200);
    expect(incrementTokenVersion).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
