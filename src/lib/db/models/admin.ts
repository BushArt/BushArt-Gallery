import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { Admin, AdminInternal } from "@/types/admin";

// ── Internal MongoDB document shapes ──────────────────────────────────────

interface AdminDoc {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  tokenVersion: number;
  createdAt: Date;
}

// ── Collection accessor ───────────────────────────────────────────────────

function collection() {
  return getDb().then((db) => db.collection<AdminDoc>("admins"));
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * A document written before `tokenVersion` existed has no such field.
 *
 * The interface says `number`, but an interface describes intent, not what is
 * actually in the database. Returning `undefined` here would let login sign a
 * token without the claim, and `JSON.stringify` drops undefined keys — so the
 * token would fail `TokenClaimsSchema` on the very next request and lock the
 * admin out with no visible cause. Defaulting to 0 is the same value a freshly
 * seeded admin has, and the first `$inc` creates the field, so revocation
 * starts working from there.
 */
function tokenVersionOf(doc: AdminDoc): number {
  return typeof doc.tokenVersion === "number" ? doc.tokenVersion : 0;
}

function docToAdmin(doc: AdminDoc): Admin {
  return {
    id: doc._id.toHexString(),
    username: doc.username,
    failedLoginAttempts: doc.failedLoginAttempts,
    lockUntil: doc.lockUntil,
    lastLoginAt: doc.lastLoginAt,
    tokenVersion: tokenVersionOf(doc),
    createdAt: doc.createdAt,
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Create a new admin document. Use during seeding only.
 *
 * @param data - The admin fields. Password must already be a bcrypt hash.
 * @returns The created admin with string id.
 */
export async function createAdmin(data: {
  username: string;
  passwordHash: string;
}): Promise<Admin> {
  const doc: AdminDoc = {
    _id: new ObjectId(),
    username: data.username,
    passwordHash: data.passwordHash,
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: null,
    tokenVersion: 0,
    createdAt: new Date(),
  };
  const col = await collection();
  await col.insertOne(doc);
  return docToAdmin(doc);
}

/**
 * Internal admin shape with passwordHash — used only by auth internals,
 * never exposed via the API layer.
 */

function docToAdminInternal(doc: AdminDoc): AdminInternal {
  return {
    id: doc._id.toHexString(),
    username: doc.username,
    passwordHash: doc.passwordHash,
    failedLoginAttempts: doc.failedLoginAttempts,
    lockUntil: doc.lockUntil,
    lastLoginAt: doc.lastLoginAt,
    tokenVersion: tokenVersionOf(doc),
    createdAt: doc.createdAt,
  };
}

/**
 * Find an admin by username — returns the full document including passwordHash.
 * INTERNAL USE ONLY. Never call this from the API layer.
 *
 * @param username - Admin username.
 * @returns The admin with passwordHash, or null.
 */
export async function getAdminByUsername(username: string): Promise<AdminInternal | null> {
  const col = await collection();
  const doc = await col.findOne({ username });
  return doc ? docToAdminInternal(doc) : null;
}

/**
 * Find an admin by username (public-safe — no passwordHash).
 *
 * @param username - Admin username.
 * @returns The admin, or null.
 */
export async function findByUsername(username: string): Promise<Admin | null> {
  const col = await collection();
  const doc = await col.findOne({ username });
  return doc ? docToAdmin(doc) : null;
}

/**
 * Find an admin by its ObjectId hex string.
 *
 * @param id - 24-character hex string.
 * @returns The admin, or null.
 */
export async function findAdminById(id: string): Promise<Admin | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? docToAdmin(doc) : null;
}

/**
 * Update login-state fields after an attempt.
 *
 * @param id - Admin id.
 * @param data - Fields to update.
 */
export async function updateLoginState(
  id: string,
  data: {
    failedLoginAttempts?: number;
    lockUntil?: Date | null;
    lastLoginAt?: Date | null;
  },
): Promise<void> {
  const col = await collection();
  const setData: Record<string, unknown> = {};
  if (data.failedLoginAttempts !== undefined) setData.failedLoginAttempts = data.failedLoginAttempts;
  if (data.lockUntil !== undefined) setData.lockUntil = data.lockUntil;
  if (data.lastLoginAt !== undefined) setData.lastLoginAt = data.lastLoginAt;
  await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: setData },
    { returnDocument: "after" },
  );
}

export async function incrementTokenVersion(id: string): Promise<void> {
  const col = await collection();
  await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $inc: { tokenVersion: 1 } },
  );
}

/**
 * Conditionally write login-state fields, succeeding only if the document
 * still holds the values the caller read.
 *
 * This is the compare half of a compare-and-swap for the lockout counter.
 * `updateLoginState` is an unconditional write: between the route's
 * `getAdminByUsername` read and the post-bcrypt write, a concurrent request
 * can move the counter (notably a successful login resetting it to 0), and
 * the stale writer then clobbers the newer state — locking out an admin who
 * just entered the correct password. Filtering on the observed values makes
 * the loser of the race retry instead of overwriting.
 *
 * Legacy detail: a document written before `failedLoginAttempts` tracking may
 * lack the field, and `{ failedLoginAttempts: 0 }` does not match a missing
 * field in Mongo. The expected-0 case therefore filters `{ $in: [0, null] }`,
 * which matches 0, null, and missing alike. Same treatment for `lockUntil`.
 *
 * @returns `true` if the document matched and was updated, `false` on conflict.
 */
export async function compareAndSetLoginState(
  id: string,
  expected: { failedLoginAttempts: number; lockUntil: Date | null },
  next: { failedLoginAttempts: number; lockUntil: Date | null },
): Promise<boolean> {
  const col = await collection();
  // `$in: [0, null]` matches 0, null, and a missing field alike (Mongo treats
  // `null` equality as matching missing). The driver types `$in` as
  // `number[]`, so the mixed literal needs a cast — runtime semantics are
  // what matters here and they are covered by the legacy-doc test below.
  const attemptsFilter = (
    expected.failedLoginAttempts === 0
      ? { $in: [0, null] }
      : expected.failedLoginAttempts
  ) as Filter<AdminDoc>["failedLoginAttempts"];
  const result = await col.findOneAndUpdate(
    {
      _id: new ObjectId(id),
      failedLoginAttempts: attemptsFilter,
      ...(expected.lockUntil === null
        ? { lockUntil: null }
        : { lockUntil: expected.lockUntil }),
    },
    {
      $set: {
        failedLoginAttempts: next.failedLoginAttempts,
        lockUntil: next.lockUntil,
      },
    },
  );
  return result !== null;
}

/**
 * Atomically find an admin by username and return the current lockout state.
 * This helper is used to re-check lockout immediately before a successful login,
 * closing a TOCTOU window where a concurrent login could reset the attempt counter.
 *
 * @returns The admin's current failedLoginAttempts and lockUntil, or null if not found.
 */
export async function findLockoutStateByUsername(username: string): Promise<{ failedLoginAttempts: number; lockUntil: Date | null } | null> {
  const col = await collection();
  const doc = await col.findOne(
    { username },
    { projection: { failedLoginAttempts: 1, lockUntil: 1 } }
  );
  if (!doc) return null;
  return {
    failedLoginAttempts: doc.failedLoginAttempts,
    lockUntil: doc.lockUntil,
  };
}
