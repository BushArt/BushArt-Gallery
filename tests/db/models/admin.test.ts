import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

function matchesValue(actual: any, expected: any): boolean {
  // Handles the filter shapes `compareAndSetLoginState` builds: exact
  // values, `{ $in: [...] }`, and Dates (compared by time, not identity).
  if (expected !== null && typeof expected === "object") {
    if ("$in" in expected && Array.isArray((expected as any).$in)) {
      return (expected as any).$in.some((v: any) => matchesValue(actual, v));
    }
    if (expected instanceof Date) {
      return actual instanceof Date && actual.getTime() === expected.getTime();
    }
  }
  if (expected === null) return actual === null || actual === undefined;
  if (actual === undefined) return false;
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }
  return actual === expected;
}

function createMockCollection<T extends { _id: ObjectId }>() {
  let docs: T[] = [];

  const matchesFilter = (d: any, filter: any): boolean => {
    for (const [key, expected] of Object.entries(filter ?? {})) {
      if (key === "_id") {
        const f: any = expected;
        if (f?.$in) {
          if (!f.$in.some((id: any) => d._id?.equals?.(id))) return false;
        } else if (!d._id?.equals?.(f)) return false;
      } else if (!matchesValue(d[key], expected)) {
        return false;
      }
    }
    return true;
  };

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
    async findOneAndUpdate(filter: any, update: any) {
      const idx = docs.findIndex((d: any) => matchesFilter(d, filter));
      if (idx === -1) return null;
      const next: any = { ...(docs[idx] as any) };
      if (update.$set) Object.assign(next, update.$set);
      if (update.$inc) {
        for (const [key, val] of Object.entries(update.$inc)) {
          next[key] = (next[key] ?? 0) + (val as number);
        }
      }
      docs[idx] = next as T;
      return next;
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
  // The model layer wraps multi-document writes in a transaction; the
  // in-memory collections are single-document, so running the callback
  // directly (no session) is the faithful behaviour for this harness.
  withTransaction: async <T>(fn: (session?: unknown) => Promise<T>) =>
    fn(undefined),
}));

beforeEach(() => {
  collections = {};
});

import { createAdmin, findByUsername, findAdminById, updateLoginState, getAdminByUsername } from "@/lib/db/models/admin";
import { getDb } from "@/lib/db/mongodb";

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

  // `tokenVersion` was introduced alongside the session-revocation work and is
  // absent from any admin document written before it. Both mappers must
  // normalise it, because login copies this value straight into the JWT:
  // an `undefined` here is dropped by JSON.stringify, the signed token then
  // fails `TokenClaimsSchema`, and every request is answered 401 — a silent
  // lockout with no error anywhere.
  describe("documents predating the tokenVersion field", () => {
    async function seedLegacyAdmin() {
      const db = await getDb();
      await db.collection("admins").insertOne({
        _id: new ObjectId(),
        username: "legacy",
        passwordHash: "bcrypt-secret",
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLoginAt: null,
        createdAt: new Date(),
        // no tokenVersion
      });
    }

    it("findByUsername reports tokenVersion 0 instead of undefined", async () => {
      await seedLegacyAdmin();

      const found = await findByUsername("legacy");

      expect(found).not.toBeNull();
      expect(found?.tokenVersion).toBe(0);
    });

    it("getAdminByUsername reports tokenVersion 0 so login signs a valid claim", async () => {
      await seedLegacyAdmin();

      const internal = await getAdminByUsername("legacy");

      expect(internal).not.toBeNull();
      expect(internal?.tokenVersion).toBe(0);
    });

    it("revocation still works: incrementing a legacy document moves it off 0", async () => {
      await seedLegacyAdmin();

      const before = await getAdminByUsername("legacy");
      expect(before?.tokenVersion).toBe(0);

      const { incrementTokenVersion } = await import("@/lib/db/models/admin");
      const legacy = await getAdminByUsername("legacy");
      await incrementTokenVersion(legacy!.id);

      // A token issued before the bump must now fail the version comparison,
      // so the backfill value cannot accidentally disable revocation.
      expect((await getAdminByUsername("legacy"))?.tokenVersion).toBe(1);
    });
  });

  // `compareAndSetLoginState` is the compare half of the lockout CAS. The
  // login route reads the counter, spends ~100-300ms in bcrypt, then writes
  // — a concurrent request can move the counter in between, notably a
  // successful login resetting it to 0. The unconditional `updateLoginState`
  // would clobber that newer state and lock out an admin who just entered
  // the correct password.
  describe("compareAndSetLoginState", () => {
    it("applies the write when the document still holds the expected values", async () => {
      const admin = await createAdmin({ username: "cas", passwordHash: "hash" });
      const { compareAndSetLoginState } = await import("@/lib/db/models/admin");

      const committed = await compareAndSetLoginState(
        admin.id,
        { failedLoginAttempts: 0, lockUntil: null },
        { failedLoginAttempts: 1, lockUntil: null },
      );

      expect(committed).toBe(true);
      expect((await findByUsername("cas"))?.failedLoginAttempts).toBe(1);
    });

    it("refuses the write when the counter moved since the read", async () => {
      const admin = await createAdmin({ username: "cas-stale", passwordHash: "hash" });
      const { compareAndSetLoginState } = await import("@/lib/db/models/admin");

      // Simulate the race loser: the caller read 4, but a concurrent request
      // already reset the counter to 0. The stale write of 5 must not land.
      await updateLoginState(admin.id, { failedLoginAttempts: 0, lockUntil: null });
      const committed = await compareAndSetLoginState(
        admin.id,
        { failedLoginAttempts: 4, lockUntil: null },
        { failedLoginAttempts: 5, lockUntil: new Date() },
      );

      expect(committed).toBe(false);
      expect((await findByUsername("cas-stale"))?.failedLoginAttempts).toBe(0);
    });

    it("matches a legacy document that lacks the failedLoginAttempts field", async () => {
      const db = await getDb();
      const id = new ObjectId();
      await db.collection("admins").insertOne({
        _id: id,
        username: "cas-legacy",
        passwordHash: "hash",
        lockUntil: null,
        lastLoginAt: null,
        createdAt: new Date(),
        // no failedLoginAttempts
      });
      const { compareAndSetLoginState } = await import("@/lib/db/models/admin");

      const committed = await compareAndSetLoginState(
        id.toHexString(),
        { failedLoginAttempts: 0, lockUntil: null },
        { failedLoginAttempts: 1, lockUntil: null },
      );

      expect(committed).toBe(true);
      expect((await findByUsername("cas-legacy"))?.failedLoginAttempts).toBe(1);
    });
  });
});
