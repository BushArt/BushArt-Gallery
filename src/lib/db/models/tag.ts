import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { TagSchema } from "@/lib/validation/tag";
import type { Tag } from "@/types/tag";

// ── Internal MongoDB document shapes ──────────────────────────────────────

interface TagDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  usageCount: number;
  createdAt: Date;
}

// ── Collection accessor ───────────────────────────────────────────────────

function collection() {
  return getDb().then((db) => db.collection<TagDoc>("tags"));
}

// ── Helpers ───────────────────────────────────────────────────────────────

function docToTag(doc: TagDoc): Tag {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    slug: doc.slug,
    usageCount: doc.usageCount,
    createdAt: doc.createdAt.toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Create a new tag.
 *
 * @param data - The tag fields (slug and usageCount are server-managed).
 * @returns The created tag.
 */
export async function createTag(data: {
  name: string;
  slug: string;
}): Promise<Tag> {
  // Validate input against schema before writing to MongoDB
  TagSchema.pick({ name: true, slug: true }).parse(data);
  const doc: TagDoc = {
    _id: new ObjectId(),
    name: data.name,
    slug: data.slug,
    usageCount: 0,
    createdAt: new Date(),
  };
  const col = await collection();
  await col.insertOne(doc);
  return docToTag(doc);
}

/**
 * List all tags, sorted by name ascending.
 */
export async function listTags(): Promise<Tag[]> {
  const col = await collection();
  const docs = await col.find().sort({ name: 1 }).toArray();
  return docs.map(docToTag);
}

/**
 * Find a single tag by its slug.
 *
 * @param slug - URL-safe slug.
 * @returns The tag, or null.
 */
export async function findTagBySlug(slug: string): Promise<Tag | null> {
  const col = await collection();
  const doc = await col.findOne({ slug });
  return doc ? docToTag(doc) : null;
}

/**
 * Find a single tag by its ObjectId hex string.
 *
 * @param id - 24-character hex string.
 * @returns The tag, or null.
 */
export async function findTagById(id: string): Promise<Tag | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? docToTag(doc) : null;
}

/**
 * Find a tag by case-insensitive name match (for duplicate detection on create).
 */
export async function findTagByNameInsensitive(name: string): Promise<Tag | null> {
  const col = await collection();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const doc = await col.findOne({
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
  });
  return doc ? docToTag(doc) : null;
}

/**
 * Fetch multiple tags by id in one query.
 */
export async function findTagsByIds(ids: string[]): Promise<Tag[]> {
  if (ids.length === 0) return [];
  const col = await collection();
  const docs = await col
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .toArray();
  return docs.map(docToTag);
}

/**
 * Verify every id references an existing tag; returns missing ids if any.
 */
export async function findMissingTagIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const found = await findTagsByIds(ids);
  const foundSet = new Set(found.map((t) => t.id));
  return ids.filter((id) => !foundSet.has(id));
}

/**
 * Increment usageCount for multiple tags by 1 each.
 *
 * @param ids - Array of 24-character hex strings.
 */
export async function incrementTagUsageCounts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const col = await collection();
  await col.updateMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) } },
    { $inc: { usageCount: 1 } },
  );
}

/**
 * Decrement usageCount for multiple tags by 1 each.
 *
 * @param ids - Array of 24-character hex strings.
 */
export async function decrementTagUsageCounts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const col = await collection();
  await col.updateMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) }, usageCount: { $gt: 0 } },
    { $inc: { usageCount: -1 } },
  );
}

/**
 * Delete a tag and cascade-remove its reference from all artworks.
 *
 * @param id - 24-character hex string.
 * @returns True if the tag existed and was deleted, false otherwise.
 */
/**
 * Cascade-pull a tag id from all artwork tagIds arrays.
 *
 * The MongoDB driver type for `$pull` has a known gap with ObjectId values;
 * this cast is isolated to the helper and kept out of the public API surface.
 */
async function pullTagFromArtworks(tagId: ObjectId): Promise<void> {
  const artworksCol = await getDb().then((db) => db.collection("artworks"));
  await artworksCol.updateMany(
    { tagIds: tagId },
    { $pull: { tagIds: tagId } } as any,
  );
}

export async function deleteTag(id: string): Promise<boolean> {
  const col = await collection();
  const tagDoc = await col.findOne({ _id: new ObjectId(id) });
  if (!tagDoc) return false;

  await pullTagFromArtworks(tagDoc._id);
  await col.deleteOne({ _id: tagDoc._id });

  return true;
}
