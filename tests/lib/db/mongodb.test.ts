import { describe, it, expect, vi, beforeEach } from "vitest";

const connectMock = vi.fn();
const closeMock = vi.fn().mockResolvedValue(undefined);

vi.mock("mongodb", () => ({
  MongoClient: class {
    constructor() {}
    connect() {
      return connectMock();
    }
    close() {
      return closeMock();
    }
  },
}));

describe("lib/db/mongodb", () => {
  beforeEach(() => {
    vi.resetModules();
    connectMock.mockReset();
    closeMock.mockClear();
  });

  it("getClient throws a clear error when MONGODB_URI is missing", async () => {
    process.env.MONGODB_URI = "";

    const { getClient } = await import("@/lib/db/mongodb");
    await expect(getClient()).rejects.toThrow(/Missing MONGODB_URI/);
  });

  it("allows a later request to reconnect after a failed connection", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/bushart-test";
    const firstError = new Error("connection refused");
    const connectedClient = { id: "connected" };
    connectMock.mockRejectedValueOnce(firstError).mockResolvedValueOnce(connectedClient);

    const { getClient } = await import("@/lib/db/mongodb");

    await expect(getClient()).rejects.toBe(firstError);
    await expect(getClient()).resolves.toBe(connectedClient);
    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
