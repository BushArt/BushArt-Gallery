import { afterEach, describe, expect, it } from "vitest";
import { validateRuntimeEnv, type RuntimeEnv } from "@/lib/env";

const validEnv: RuntimeEnv = {
  MONGODB_URI: "mongodb://localhost:27017/bushart-test",
  JWT_SECRET: "a-valid-production-secret-with-at-least-32-chars",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

// @types/node declares process.env.NODE_ENV read-only; mutate through a
// widened view so the validateRuntimeEnv tests can set it without a type error.
const mutableEnv = process.env as Record<string, string | undefined>;
const originalNodeEnv = mutableEnv.NODE_ENV;

afterEach(() => {
  mutableEnv.NODE_ENV = originalNodeEnv;
});

describe("validateRuntimeEnv", () => {
  it("accepts a complete runtime environment", () => {
    expect(validateRuntimeEnv(validEnv)).toEqual(validEnv);
  });

  it("rejects missing and empty required values without exposing secrets", () => {
    const invalid = { ...validEnv, MONGODB_URI: "", CLOUDINARY_API_SECRET: undefined };

    expect(() => validateRuntimeEnv(invalid)).toThrow(/MONGODB_URI|CLOUDINARY_API_SECRET/);
    expect(() => validateRuntimeEnv(invalid)).toThrow(
      "Invalid runtime environment. Set valid values for",
    );
    expect(() => validateRuntimeEnv({ ...invalid, JWT_SECRET: "sensitive-value" })).not.toThrow(
      /sensitive-value/,
    );
  });

  it("rejects malformed site URLs", () => {
    expect(() => validateRuntimeEnv({ ...validEnv, NEXT_PUBLIC_SITE_URL: "not-a-url" })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it("requires a 32-character JWT secret in production", () => {
    mutableEnv.NODE_ENV = "production";

    expect(() =>
      validateRuntimeEnv({ ...validEnv, JWT_SECRET: "too-short" }),
    ).toThrow("JWT_SECRET must be at least 32 characters in production");
  });

  it("allows shorter deterministic secrets outside production", () => {
    mutableEnv.NODE_ENV = "test";

    expect(validateRuntimeEnv({ ...validEnv, JWT_SECRET: "test-secret" }).JWT_SECRET).toBe(
      "test-secret",
    );
  });
});
