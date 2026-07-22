#!/usr/bin/env node

/**
 * db-setup.mjs
 *
 * Creates every index defined in `04-Database-Schema.md` §3–6.
 * Idempotent — running it multiple times causes no errors.
 *
 * Usage: node scripts/db-setup.mjs
 * Env:   MONGODB_URI must be set.
 */

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set.");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log("📦 Connected to MongoDB — creating indexes...\n");

  // ── artworks ────────────────────────────────────────────────
  const artworks = db.collection("artworks");

  await artworks.createIndex({ slug: 1 }, { unique: true, name: "artworks_slug_unique" });
  console.log("  ✅ artworks_slug_unique");

  await artworks.createIndex(
    { nsfw: 1, type: 1, completionDate: -1, _id: -1 },
    { name: "artworks_gallery_feed" },
  );
  console.log("  ✅ artworks_gallery_feed");

  await artworks.createIndex({ tagIds: 1 }, { name: "artworks_tagIds" });
  console.log("  ✅ artworks_tagIds");

  await artworks.createIndex({ createdAt: -1 }, { name: "artworks_createdAt" });
  console.log("  ✅ artworks_createdAt");

  await artworks.createIndex(
    { featured: 1, featuredOrder: 1 },
    { name: "artworks_featured" },
  );
  console.log("  ✅ artworks_featured");

  // ── tags ────────────────────────────────────────────────────
  const tags = db.collection("tags");

  await tags.createIndex({ slug: 1 }, { unique: true, name: "tags_slug_unique" });
  console.log("  ✅ tags_slug_unique");

  await tags.createIndex(
    { name: 1 },
    { unique: true, collation: { locale: "en", strength: 2 }, name: "tags_name_unique" },
  );
  console.log("  ✅ tags_name_unique");

  // ── admins ──────────────────────────────────────────────────
  const admins = db.collection("admins");

  await admins.createIndex(
    { username: 1 },
    { unique: true, name: "admins_username_unique" },
  );
  console.log("  ✅ admins_username_unique");

  console.log("\n✅ All indexes created successfully.");

  await client.close();
}

main().catch((err) => {
  console.error("❌ Index setup failed:", err.message);
  process.exit(1);
});