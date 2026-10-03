import { ObjectId, type Filter } from "mongodb";
import { getDb, withTransaction } from "@/lib/db/mongodb";
import { TagSchema } from "@/lib/validation/tag";
import type { Tag } from "@/types/tag";

interface TagDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  usageCount: number;
  createdAt: Date;
}

function collection() {
  return getDb().then((db) => db.collection<TagDoc>("tags"));
}

function docToTag(doc: TagDoc): Tag {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    slug: doc.slug,
    usageCount: doc.usageCount,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function createTag(data: {
  name: string;
  slug: string;
}): Promise<Tag> {
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

export async function listTags(): Promise<Tag[]> {
  const col = await collection();
  const docs = await col.find().sort({ name: 1 }).toArray();
  return docs.map(docToTag);
}

export async function findTagBySlug(slug: string): Promise<Tag | null> {
  const col = await collection();
  const doc = await col.findOne({ slug });
  return doc ? docToTag(doc) : null;
}

export async function findTagById(id: string): Promise<Tag | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? docToTag(doc) : null;
}

export async function findTagByNameInsensitive(name: string): Promise<Tag | null> {
  const col = await collection();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const doc = await col.findOne({
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
  });
  return doc ? docToTag(doc) : null;
}

export async function findTagsByIds(ids: string[]): Promise<Tag[]> {
  if (ids.length === 0) return [];
  const col = await collection();
  const docs = await col
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .toArray();
  return docs.map(docToTag);
}

export async function findMissingTagIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const found = await findTagsByIds(ids);
  const foundSet = new Set(found.map((t) => t.id));
  return ids.filter((id) => !foundSet.has(id));
}

export async function incrementTagUsageCounts(
  ids: string[],
  session?: import("mongodb").ClientSession,
): Promise<void> {
  if (ids.length === 0) return;
  const col = await collection();
  await col.updateMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) } },
    { $inc: { usageCount: 1 } },
    { session },
  );
}

export async function decrementTagUsageCounts(
  ids: string[],
  session?: import("mongodb").ClientSession,
): Promise<void> {
  if (ids.length === 0) return;
  const col = await collection();
  await col.updateMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) }, usageCount: { $gt: 0 } },
    { $inc: { usageCount: -1 } },
    { session },
  );
}

async function pullTagFromArtworks(
  tagId: ObjectId,
  session?: import("mongodb").ClientSession,
): Promise<void> {
  const artworksCol = await getDb().then((db) => db.collection("artworks"));
  await artworksCol.updateMany(
    { tagIds: tagId },
    { $pull: { tagIds: tagId } } as any,
    { session },
  );
}

export async function deleteTag(id: string): Promise<boolean> {
  const col = await collection();
  const tagDoc = await col.findOne({ _id: new ObjectId(id) });
  if (!tagDoc) return false;

  return withTransaction(async (session) => {
    await pullTagFromArtworks(tagDoc._id, session);
    await col.deleteOne({ _id: tagDoc._id }, { session });
    return true;
  });
}
