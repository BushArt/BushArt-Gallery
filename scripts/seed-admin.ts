#!/usr/bin/env node

/**
 * seed-admin.ts
 *
 * One-time admin bootstrap script. Creates the first administrator document
 * from environment variables. Idempotent — if the username already exists,
 * the script skips without error.
 *
 * Usage: npm run seed:admin
 * Env:   MONGODB_URI, INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD must be set.
 */

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const RAW_URI = process.env.MONGODB_URI;
const RAW_USERNAME = process.env.INITIAL_ADMIN_USERNAME;
const RAW_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;

if (!RAW_URI) {
  console.error("❌ MONGODB_URI is not set.");
  process.exit(1);
}

if (!RAW_USERNAME) {
  console.error("❌ INITIAL_ADMIN_USERNAME is not set.");
  process.exit(1);
}

if (!RAW_PASSWORD) {
  console.error("❌ INITIAL_ADMIN_PASSWORD is not set.");
  process.exit(1);
}

const MONGODB_URI: string = RAW_URI;
const USERNAME: string = RAW_USERNAME;
const PASSWORD: string = RAW_PASSWORD;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const admins = db.collection("admins");

  // Check if admin already exists (idempotency)
  const existing = await admins.findOne({ username: USERNAME });
  if (existing) {
    console.log(`ℹ️  Admin "${USERNAME}" already exists — skipping.`);
    await client.close();
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await admins.insertOne({
    username: USERNAME,
    passwordHash,
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
  });

  console.log(`✅ Admin "${USERNAME}" created successfully.`);
  await client.close();
}

main().catch((err) => {
  console.error("❌ Admin seed failed:", err.message);
  process.exit(1);
});