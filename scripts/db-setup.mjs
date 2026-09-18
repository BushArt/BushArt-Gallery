#!/usr/bin/env node

/**
 * db-setup.mjs
 *
 * Creates every index defined in `04-Database-Schema.md` §3–6 by delegating to
 * the shared spec in `src/lib/db/indexes.ts` — the same code the app runs at
 * boot (`src/instrumentation.ts`), so the two can never drift apart.
 * Idempotent — running it multiple times causes no errors.
 *
 * Usage: npm run db:setup
 * Env:   MONGODB_URI must be set. `.env.local` is loaded when present; on
 *        Render the dashboard supplies it (the file is never deployed).
 *
 * Runs through tsx because it imports the application's TypeScript modules.
 */

import { loadEnvLocal } from "./load-env.mjs";
import { ensureIndexes } from "../src/lib/db/indexes";
import { getDb, getClient } from "../src/lib/db/mongodb";

loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set.");
  process.exit(1);
}

try {
  console.log("📦 Connected to MongoDB — creating indexes...\n");
  await ensureIndexes(await getDb());
  console.log("\n✅ All indexes created successfully.");
  // Release the pooled client so the process can exit on its own.
  await getClient().then((client) => client.close()).catch(() => undefined);
} catch (err) {
  console.error("❌ Index setup failed:", err.message);
  process.exit(1);
}