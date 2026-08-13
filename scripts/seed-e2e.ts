/**
 * Seeds minimal data for Playwright E2E tests.
 * Run after db:setup with MONGODB_URI pointing at a test database.
 */
import { MongoClient, ObjectId } from "mongodb";

const E2E_SLUG = "e2e-test-art";
const E2E_NSFW_SLUG = "e2e-nsfw-art";
const E2E_TAG_ID = new ObjectId("65e2e2e2e2e2e2e2e2e2e2e2");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  await db.collection("tags").updateOne(
    { _id: E2E_TAG_ID },
    {
      $set: {
        name: "E2E Tag",
        slug: "e2e-tag",
        usageCount: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
    { upsert: true },
  );

  await db.collection("artworks").updateOne(
    { slug: E2E_SLUG },
    {
      $set: {
        slug: E2E_SLUG,
        title: "E2E Test Artwork",
        description: "Seeded artwork for Playwright E2E tests.",
        medium: "Digital",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [
          {
            publicId: "bushart/e2e/test-image",
            url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            width: 800,
            height: 600,
            order: 0,
          },
          {
            publicId: "bushart/e2e/test-image-2",
            url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            width: 800,
            height: 600,
            order: 1,
          },
        ],
        timelapse: null,
        tagIds: [E2E_TAG_ID],
        completionDate: new Date("2026-03-01T00:00:00.000Z"),
        colorPalette: null,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    },
    { upsert: true },
  );

  await db.collection("artworks").updateOne(
    { slug: E2E_NSFW_SLUG },
    {
      $set: {
        slug: E2E_NSFW_SLUG,
        title: "E2E NSFW Artwork",
        description: "NSFW seeded artwork for Playwright E2E tests.",
        medium: "Digital",
        type: "personal",
        nsfw: true,
        featured: false,
        featuredOrder: null,
        images: [
          {
            publicId: "bushart/e2e/nsfw-image",
            url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            width: 800,
            height: 600,
            order: 0,
          },
        ],
        timelapse: null,
        tagIds: [E2E_TAG_ID],
        completionDate: new Date("2026-03-01T00:00:00.000Z"),
        colorPalette: null,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    },
    { upsert: true },
  );

  await db.collection("site_settings").updateOne(
    {},
    {
      $set: {
        artistName: "E2E Artist",
        tagline: "Test gallery",
        biography: "Seeded for E2E.",
        socialLinks: [],
        contactEmail: null,
        contactUrl: null,
        profileImage: null,
        bannerImage: null,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    },
    { upsert: true },
  );

  await client.close();
  console.log(`E2E seed complete — artwork slugs: ${E2E_SLUG}, ${E2E_NSFW_SLUG}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
