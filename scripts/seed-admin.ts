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

import { hashPassword } from "@/lib/auth/password";
import { findByUsername, createAdmin } from "@/lib/db/models/admin";
import { getDb } from "@/lib/db/mongodb";

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

const USERNAME: string = RAW_USERNAME;
const PASSWORD: string = RAW_PASSWORD;

async function main() {
  // Ensure DB connection is initialized
  await getDb();

  // Check if admin already exists (idempotency)
  const existing = await findByUsername(USERNAME);
  if (existing) {
    console.log(`ℹ️  Admin "${USERNAME}" already exists — skipping.`);
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);

  await createAdmin({ username: USERNAME, passwordHash });

  console.log(`✅ Admin "${USERNAME}" created successfully.`);
}

main().catch((err) => {
  console.error("❌ Admin seed failed:", err.message);
  process.exit(1);
});
