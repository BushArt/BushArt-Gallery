import { describe, it, expect, vi, afterEach } from "vitest";
import { error, warn, info, debug } from "@/lib/logger";

// The logger reads process.env.NODE_ENV at module load. In the test env it is
// "test" (not "production"), so IS_DEBUG=true and currentLevel=debug(3).
// Therefore error/warn/info/debug all emit.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger level gating", () => {
  it("emits error, warn, info, debug in test env", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    error("e", { route: "/x" });
    warn("w", { route: "/x" });
    info("i", { route: "/x" });
    debug("d", { route: "/x" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).toHaveBeenCalledTimes(1);
  });
});

describe("logger message formatting", () => {
  it("includes timestamp, level, and message", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    info("Route handler entered", { route: "/api/artworks" });
    const [output] = spy.mock.calls[0] as [string];
    expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T.*\[INFO\] Route handler entered/);
    expect(output).toContain('"route":"/api/artworks"');
  });

  it("omits context when none is provided", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    info("No context");
    const [output] = spy.mock.calls[0] as [string];
    expect(output).toMatch(/\[INFO\] No context$/);
  });
});

describe("logger error serialization", () => {
  it("preserves Error message and stack instead of dropping to {}", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("database down");
    error("DB failed", { error: boom });
    const [output] = spy.mock.calls[0] as [string];
    expect(output).toContain('"message":"database down"');
    expect(output).toContain('"name":"Error"');
    expect(output).toContain('"stack"');
  });
});

describe("logger context sanitization", () => {
  it("masks sensitive top-level keys", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    info("login", { username: "bush", password: "hunter2", token: "abc" });
    const [output] = spy.mock.calls[0] as [string];
    expect(output).toContain('"password":"***MASKED***"');
    expect(output).toContain('"token":"***MASKED***"');
    expect(output).not.toContain("hunter2");
    expect(output).not.toContain("abc");
  });

  it("masks sensitive keys nested inside objects", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    info("user", { user: { username: "bush", passwordHash: "deadbeef" } });
    const [output] = spy.mock.calls[0] as [string];
    expect(output).toContain('"passwordHash":"***MASKED***"');
    expect(output).not.toContain("deadbeef");
  });
});

describe("logger resilience", () => {
  it("does not throw on circular context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;
    // The depth guard in sanitizeValue prevents infinite recursion, so
    // JSON.stringify never throws — the log still emits with truncated context.
    expect(() => error("circular", { circular })).not.toThrow();
    const [output] = spy.mock.calls[0] as [string];
    expect(output).toContain("[ERROR] circular");
  });
});
