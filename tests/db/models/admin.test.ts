import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

function createMockCollection<T extends { _id: ObjectId }>() {
  let docs: T[] = [];

  const base = {
    async insertOne(doc: T) { docs.push(doc); },
    async findOne(filter: any) {
      return docs.find((d: any) => {
        if (filter._id) {
          if (filter._id.$in) {
            if (!filter._id.$in.some((id: any) => d._id?.equals?.(id))) return false;
          } else if (!d._id?.equals?.(filter._id)) return false;
        }
        return true;
      }) ?? null;
    },
    async updateOne(filter: any, update: any) {
      const idx = docs.findIndex((d: any) => d._id?.equals?.(filter._id) ?? false);
      if (idx !== -1) docs[idx] = { ...docs[idx], ...update.$set };
    },
    find(_filter: any) {
      const filter = _filter ?? {};
      const filtered = docs.filter((d: any) => {
        if (!filter._id) return true;
        if (filter._id.$in) return filter._id.$in.some((id: any) => d._id?.equals?.(id));
        return d._id?.equals?.(filter._id);
      });
      return {
        sort() { return this; },
        project() { return this; },
        limit() { return this; },
        async toArray() { return filtered; },
      } as any;
    },
    async toArray() { return [...docs]; },
  };

  return base as any;
}

type Collections = Record<string, ReturnType<typeof createMockCollection<any>>>;
let collections: Collections = {};

vi.mock("@/lib/db/mongodb", () => ({
  getDb: () =>
    Promise.resolve({
      collection: (name: string) => {
        if (!collections[name]) {
          collections[name] = createMockCollection<any>();
        }
        return collections[name];
      },
    }),
}));

beforeEach(() => {
  collections = {};
});

import { createAdmin, findByUsername, findAdminById, updateLoginState, getAdminByUsername } from "@/lib/db/models/admin";

describe("models/admin", () => {
  it("createAdmin + findByUsername round-trip", async () => {
    await createAdmin({ username: "alice", passwordHash: "hash" });
    const found = await findByUsername("alice");
    expect(found?.username).toBe("alice");
    // passwordHash is intentionally not exposed on the public shape
  });

  it("findAdminById returns the admin", async () => {
    const admin = await createAdmin({ username: "carol", passwordHash: "hash" });
    const found = await findAdminById(admin.id);
    expect(found?.username).toBe("carol");
  });

  it("updateLoginState updates fields", async () => {
    const admin = await createAdmin({ username: "bob", passwordHash: "hash" });
    await updateLoginState(admin.id, {
      failedLoginAttempts: 3,
      lockUntil: null,
      lastLoginAt: new Date(),
    });
    const updated = await findByUsername("bob");
    expect(updated?.failedLoginAttempts).toBe(3);
    expect(updated?.lastLoginAt).toBeTruthy();
  });

  it("getAdminByUsername returns AdminInternal with passwordHash", async () => {
    const created = await createAdmin({ username: "dave", passwordHash: "bcrypt-secret" });
    const internal = await getAdminByUsername("dave");
    expect(internal?.id).toBe(created.id);
    expect(internal?.passwordHash).toBe("bcrypt-secret");
  });
});
