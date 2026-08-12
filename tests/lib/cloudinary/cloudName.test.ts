import { describe, it, expect, vi, afterEach } from "vitest";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Re-import the real cloudName module against a controlled env. The module
 * reads env at module scope, so each case resets modules and sets the vars
 * before the dynamic import.
 */
async function resolveCloudName(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  const mod = await import("@/lib/cloudinary/cloudName");
  return mod.cloudName;
}

afterEach(() => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("cloudName resolution", () => {
  it("prefers the server-side CLOUDINARY_CLOUD_NAME when both are set", async () => {
    const cloudName = await resolveCloudName({
      CLOUDINARY_CLOUD_NAME: "server-cloud",
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "browser-cloud",
    });
    expect(cloudName).toBe("server-cloud");
  });

  it("falls back to NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME for browser builds", async () => {
    const cloudName = await resolveCloudName({
      CLOUDINARY_CLOUD_NAME: undefined,
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "browser-cloud",
    });
    expect(cloudName).toBe("browser-cloud");
  });

  it("is undefined when neither variable is set", async () => {
    const cloudName = await resolveCloudName({
      CLOUDINARY_CLOUD_NAME: undefined,
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: undefined,
    });
    expect(cloudName).toBeUndefined();
  });
});
