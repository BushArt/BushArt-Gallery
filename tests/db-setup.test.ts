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

  it("creates artworks_slug_unique with correct options", async () => {
    const db = client.db();
    const indexes = await db.collection("artworks").listIndexes().toArray();
    const slugIdx = indexes.find((idx) => idx.name === "artworks_slug_unique");

    expect(slugIdx).toBeDefined();
    expect(slugIdx!.unique).toBe(true);
    expect(slugIdx!.key).toEqual({ slug: 1 });
  });

  it("creates all tags indexes", async () => {
    const db = client.db();
    const indexes = await db.collection("tags").listIndexes().toArray();
    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain("tags_slug_unique");
    expect(indexNames).toContain("tags_name_unique");
  });

  it("creates tags_name_unique with case-insensitive collation", async () => {
    const db = client.db();
    const indexes = await db.collection("tags").listIndexes().toArray();
    const nameIdx = indexes.find((idx) => idx.name === "tags_name_unique");

    expect(nameIdx).toBeDefined();
    expect(nameIdx!.unique).toBe(true);
    expect(nameIdx!.key).toEqual({ name: 1 });
    expect(nameIdx!.collation).toEqual(
      expect.objectContaining({ locale: "en", strength: 2 }),
    );
  });

  it("creates all admins indexes", async () => {
    const db = client.db();
    const indexes = await db.collection("admins").listIndexes().toArray();
    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain("admins_username_unique");
  });

  it("creates admins_username_unique with correct options", async () => {
    const db = client.db();
    const indexes = await db.collection("admins").listIndexes().toArray();
    const userIdx = indexes.find((idx) => idx.name === "admins_username_unique");

    expect(userIdx).toBeDefined();
    expect(userIdx!.unique).toBe(true);
    expect(userIdx!.key).toEqual({ username: 1 });
  });

  it("is idempotent — re-running artworks_slug_unique creation does not error", async () => {
    const db = client.db();
    // This mimics what db-setup.mjs does: createIndex with the same name+spec
    await expect(
      db.collection("artworks").createIndex({ slug: 1 }, { unique: true, name: "artworks_slug_unique" }),
    ).resolves.not.toThrow();
  });

  it("creates no custom indexes on site_settings (only _id_)", async () => {
    const db = client.db();
    // Ensure site_settings exists by explicitly creating it
    const collections = await db.listCollections({ name: "site_settings" }).toArray();
    if (collections.length === 0) {
      await db.createCollection("site_settings");
    }
    const indexes = await db.collection("site_settings").listIndexes().toArray();
    // Only the default _id_ index should exist
    expect(indexes).toHaveLength(1);
    expect(indexes[0].name).toBe("_id_");
  });
});