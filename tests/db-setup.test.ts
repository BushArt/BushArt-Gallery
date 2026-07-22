import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

// Skip suite if no MONGODB_URI is set (e.g., in CI without a test DB)
const describeSuite = MONGODB_URI ? describe : describe.skip;

describeSuite("db-setup — index creation", () => {
  let client: MongoClient;

  beforeAll(async () => {
    client = new MongoClient(MONGODB_URI!);
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
  });

  it("creates all artworks indexes", async () => {
    const db = client.db();
    const indexes = await db.collection("artworks").listIndexes().toArray();
    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain("artworks_slug_unique");
    expect(indexNames).toContain("artworks_gallery_feed");
    expect(indexNames).toContain("artworks_tagIds");
    expect(indexNames).toContain("artworks_createdAt");
    expect(indexNames).toContain("artworks_featured");
  });

  it("creates all tags indexes", async () => {
    const db = client.db();
    const indexes = await db.collection("tags").listIndexes().toArray();
    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain("tags_slug_unique");
    expect(indexNames).toContain("tags_name_unique");
  });

  it("creates all admins indexes", async () => {
    const db = client.db();
    const indexes = await db.collection("admins").listIndexes().toArray();
    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain("admins_username_unique");
  });

  it("creates no custom indexes on site_settings (only _id_)", async () => {
    const db = client.db();
    // site_settings collection may not exist yet (created on first settings write)
    const collections = await db.listCollections({ name: "site_settings" }).toArray();
    if (collections.length === 0) {
      // Collection doesn't exist — no custom indexes possible, which satisfies the intent
      expect(true).toBe(true);
      return;
    }
    const indexes = await db.collection("site_settings").listIndexes().toArray();
    // Only the default _id_ index should exist
    expect(indexes).toHaveLength(1);
    expect(indexes[0].name).toBe("_id_");
  });
});