import { describe, it, expect } from "vitest";
import {
  LoginRequestSchema,
  AdminProfileSchema,
  AuthMeResponseSchema,
  ErrorEnvelopeSchema,
  UnauthenticatedResponseSchema,
} from "@/lib/validation/auth";

describe("LoginRequestSchema", () => {
  it("accepts valid login request", () => {
    expect(() =>
      LoginRequestSchema.parse({ username: "admin", password: "secret" }),
    ).not.toThrow();
  });

  it("rejects empty username", () => {
    expect(() =>
      LoginRequestSchema.parse({ username: "", password: "secret" }),
    ).toThrow();
  });

  it("rejects empty password", () => {
    expect(() =>
      LoginRequestSchema.parse({ username: "admin", password: "" }),
    ).toThrow();
  });

  it("rejects username >100 chars", () => {
    expect(() =>
      LoginRequestSchema.parse({ username: "x".repeat(101), password: "secret" }),
    ).toThrow();
  });

  it("rejects password >256 chars", () => {
    expect(() =>
      LoginRequestSchema.parse({ username: "admin", password: "x".repeat(257) }),
    ).toThrow();
  });

  it("rejects missing username", () => {
    expect(() =>
      LoginRequestSchema.parse({ password: "secret" }),
    ).toThrow();
  });

  it("rejects missing password", () => {
    expect(() =>
      LoginRequestSchema.parse({ username: "admin" }),
    ).toThrow();
  });
});

describe("AdminProfileSchema", () => {
  it("accepts valid admin profile", () => {
    expect(() =>
      AdminProfileSchema.parse({ id: "65a1f2b3c4d5e6f7a8b9c0d1", username: "admin" }),
    ).not.toThrow();
  });
});

describe("UnauthenticatedResponseSchema", () => {
  it("accepts unauthenticated response", () => {
    expect(() =>
      UnauthenticatedResponseSchema.parse({ authenticated: false }),
    ).not.toThrow();
  });

  it("rejects authenticated: true", () => {
    expect(() =>
      UnauthenticatedResponseSchema.parse({ authenticated: true }),
    ).toThrow();
  });
});

describe("AuthMeResponseSchema", () => {
  it("accepts authenticated response", () => {
    expect(() =>
      AuthMeResponseSchema.parse({ id: "65a1f2b3c4d5e6f7a8b9c0d1", username: "admin" }),
    ).not.toThrow();
  });

  it("accepts unauthenticated response", () => {
    expect(() =>
      AuthMeResponseSchema.parse({ authenticated: false }),
    ).not.toThrow();
  });
});

describe("ErrorEnvelopeSchema", () => {
  it("accepts valid error envelope", () => {
    expect(() =>
      ErrorEnvelopeSchema.parse({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
          details: { resourceId: "abc" },
        },
      }),
    ).not.toThrow();
  });

  it("uses default empty object for details", () => {
    const result = ErrorEnvelopeSchema.parse({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid input",
      },
    });
    expect(result.error.details).toEqual({});
  });
});