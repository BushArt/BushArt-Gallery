import type { Db } from "mongodb";
import { getDb, getUriDbName } from "./mongodb";
import { info as logInfo } from "@/lib/logger";

/**
 * Creates every index the application relies on, per `04-Database-Schema.md`
 * §3–6. This module is the single source of truth for that list — it is used
 * by the app's boot-time task (`src/instrumentation.ts`) and by the standalone
 * `npm run db:setup` script, so the two can never drift apart.
 *
 * Idempotent: creating an index that already exists is a server-side no-op.
 * All creations run in parallel, so the cost is roughly one round trip.
 *
 * @param db - Database handle. Callers outside a Next request scope (the
 *   setup script, the boot hook) pass the handle from `getDb()`.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  const artworks = db.collection("artworks");
  const tags = db.collection("tags");
  const admins = db.collection("admins");

  await Promise.all([
    artworks.createIndex({ slug: 1 }, { unique: true, name: "artworks_slug_unique" }),
    artworks.createIndex(
      { nsfw: 1, type: 1, completionDate: -1, _id: -1 },
      { name: "artworks_gallery_feed" },
    ),
    artworks.createIndex({ tagIds: 1 }, { name: "artworks_tagIds" }),
    artworks.createIndex({ createdAt: -1 }, { name: "artworks_createdAt" }),
    artworks.createIndex({ featured: 1, featuredOrder: 1 }, { name: "artworks_featured" }),
    tags.createIndex({ slug: 1 }, { unique: true, name: "tags_slug_unique" }),
    tags.createIndex(
      { name: 1 },
      { unique: true, collation: { locale: "en", strength: 2 }, name: "tags_name_unique" },
    ),
    admins.createIndex({ username: 1 }, { unique: true, name: "admins_username_unique" }),
  ]);
}

const TEST_DATABASE_NAMES = new Set(["bushart-test", "bushart-e2e"]);

function isTestDatabaseName(name: string): boolean {
  return TEST_DATABASE_NAMES.has(name) || name.endsWith("-test");
}

let pending: Promise<void> | null = null;

/**
 * Boot-time variant used by `src/instrumentation.ts`.
 *
 * - Runs at most once per process.
 * - Never targets a test database (ADR-014).
 * - Rejects on failure so the caller decides the policy; the memoised promise
 *   is cleared so a later boot (or caller) can retry. Index creation is
 *   idempotent, so a successful later run heals a failed earlier one.
 */
export function ensureIndexesOnce(): Promise<void> {
  pending ??= (async () => {
    const dbName = getUriDbName() ?? "bushart";
    if (isTestDatabaseName(dbName)) return;
    await ensureIndexes(await getDb());
    // One info line per boot so the deployed instance's log proves the task ran.
    logInfo("Database indexes ensured", { database: dbName });
  })();
  pending.catch(() => {
    pending = null;
  });
  return pending;
}