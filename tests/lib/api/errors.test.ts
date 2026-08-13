import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";
import { apiError, handleRouteError, OBJECT_ID_REGEX } from "@/lib/api/errors";

describe("apiError", () => {
  it("returns JSON error envelope with status and details", async () => {
    const res = apiError(400, "VALIDATION_ERROR", "Invalid input", { field: "title" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: { field: "title" },
      },
    });
  });

  it("defaults details to empty object", async () => {
    const res = apiError(401, "UNAUTHENTICATED", "Not logged in");
    const body = await res.json();
    expect(body.error.details).toEqual({});
  });
});

describe("handleRouteError", () => {
  it("passes through Response instances unchanged", () => {
    const original = NextResponse.json({ ok: true }, { status: 200 });
    expect(handleRouteError(original, "test")).toBe(original);
  });

  it("logs and returns 500 INTERNAL_ERROR for unknown errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleRouteError(new Error("boom"), "MyRoute");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(consoleSpy).toHaveBeenCalledWith("MyRoute:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe("OBJECT_ID_REGEX", () => {
  it("matches valid 24-char hex ObjectIds", () => {
    expect(OBJECT_ID_REGEX.test("507f1f77bcf86cd799439011")).toBe(true);
    expect(OBJECT_ID_REGEX.test("abcdef0123456789abcdef01")).toBe(true);
  });

  it("rejects invalid ObjectId strings", () => {
    expect(OBJECT_ID_REGEX.test("too-short")).toBe(false);
    expect(OBJECT_ID_REGEX.test("gggggggggggggggggggggggg")).toBe(false);
    expect(OBJECT_ID_REGEX.test("")).toBe(false);
  });
});
