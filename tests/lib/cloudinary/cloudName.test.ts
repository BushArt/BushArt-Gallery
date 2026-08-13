import { describe, it, expect, vi, afterEach } from "vitest";

async function loadResolveCloudName(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  const mod = await import("@/lib/cloudinary/cloudName");
  return mod.resolveCloudName();
}

afterEach(() => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
});

describe("cloudName resolution", () => {
  it("prefers NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME for browser builds", async () => {
    const name = await loadResolveCloudName({
      CLOUDINARY_CLOUD_NAME: "server-cloud",
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "browser-cloud",
    });
    expect(name).toBe("browser-cloud");
  });

  it("falls back to CLOUDINARY_CLOUD_NAME when public var is unset", async () => {
    const name = await loadResolveCloudName({
      CLOUDINARY_CLOUD_NAME: "server-cloud",
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: undefined,
    });
    expect(name).toBe("server-cloud");
  });

  it("is undefined when neither variable is set", async () => {
    const name = await loadResolveCloudName({
      CLOUDINARY_CLOUD_NAME: undefined,
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: undefined,
    });
    expect(name).toBeUndefined();
  });
});
