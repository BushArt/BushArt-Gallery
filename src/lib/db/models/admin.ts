import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import bcrypt from "bcryptjs";
// ── Internal MongoDB document shapes ──────────────────────────────────────

interface AdminDoc {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

// ── Collection accessor ───────────────────────────────────────────────────

function collection() {
  return getDb().then((db) => db.collection<AdminDoc>("admins"));
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Public-safe admin shape (no secret material). */
export type AdminPublic = {
  id: string;
  username: string;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

function docToAdmin(doc: AdminDoc): AdminPublic {
  return {
    id: doc._id.toHexString(),
    username: doc.username,
    failedLoginAttempts: doc.failedLoginAttempts,
    lockUntil: doc.lockUntil,
    lastLoginAt: doc.lastLoginAt,
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
}): Promise<AdminPublic> {
  const doc: AdminDoc = {
    _id: new ObjectId(),
    username: data.username,
    passwordHash: data.passwordHash,
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: null,
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
export interface AdminInternal {
  id: string;
  username: string;
  passwordHash: string;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
}

function docToAdminInternal(doc: AdminDoc): AdminInternal {
  return {
    id: doc._id.toHexString(),
    username: doc.username,
    passwordHash: doc.passwordHash,
    failedLoginAttempts: doc.failedLoginAttempts,
    lockUntil: doc.lockUntil,
    lastLoginAt: doc.lastLoginAt,
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
export async function findByUsername(username: string): Promise<AdminPublic | null> {
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
export async function findAdminById(id: string): Promise<AdminPublic | null> {
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
    failedLoginAttempts: number;
    lockUntil: Date | null;
    lastLoginAt: Date | null;
  },
): Promise<void> {
  const col = await collection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: data });
}

/**
 * Hash a plaintext password using bcrypt, cost factor 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a plaintext password against a stored hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}