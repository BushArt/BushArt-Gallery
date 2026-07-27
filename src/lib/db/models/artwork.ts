import { ObjectId, type Sort, type Filter } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { ArtworkSchema, ArtworkBaseSchema, ImageAssetSchema, VideoAssetSchema } from "@/lib/validation/artwork";
import { z } from "zod";
import type { Artwork, ArtworkListItem, ImageAsset, VideoAsset } from "@/types/artwork";

/**
 * Internal validation schema for createArtwork.
 * Matches the internal CreateArtworkData shape (Date for dates, ObjectId[] for tagIds).
 * Field-level constraints mirror ArtworkBaseSchema; cross-field refinements are delegated
 * to the API-layer ArtworkSchema.
 */
const ArtworkCreateInternalSchema = z.object({
  slug: ArtworkBaseSchema.shape.slug,
  title: ArtworkBaseSchema.shape.title,
  description: ArtworkBaseSchema.shape.description,
  medium: ArtworkBaseSchema.shape.medium,
  type: ArtworkBaseSchema.shape.type,
  nsfw: ArtworkBaseSchema.shape.nsfw,
  featured: ArtworkBaseSchema.shape.featured,
  featuredOrder: ArtworkBaseSchema.shape.featuredOrder,
  images: ArtworkBaseSchema.shape.images,
  timelapse: ArtworkBaseSchema.shape.timelapse,
  // tagIds is already validated as string ObjectIds by the API layer and converted to ObjectId[] before reaching the DB layer.
  tagIds: z.array(z.any()),
  completionDate: z.date({ message: "completionDate must be a Date object" }),
});

/**
 * Internal validation schema for updateArtwork.
 * All fields optional, same internal Date/ObjectId types as CreateInternalSchema.
 */
const ArtworkUpdateInternalSchema = ArtworkCreateInternalSchema.partial();

// ── Internal MongoDB document shapes ──────────────────────────────────────

interface ArtworkDoc {
  _id: ObjectId;
  slug: string;
  title: string;
  description: string | null;
  medium: string;
  type: "personal" | "commission";
  nsfw: boolean;
  featured: boolean;
  featuredOrder: number | null;
  images: ImageAsset[];
  timelapse: VideoAsset | null;
  tagIds: ObjectId[];
  completionDate: Date;
  colorPalette: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Shape used for the gallery-feed cursor. */
interface CursorPayload {
  sortValue: string; // ISO string of the sort field (completionDate or createdAt)
  _id: string; // hex string of the _id tiebreaker
}

/** Fields that can be provided when creating an artwork (server manages _id, timestamps, colorPalette). */
type CreateArtworkData = Omit<
  ArtworkDoc,
  "_id" | "createdAt" | "updatedAt" | "colorPalette"
>;

/** Fields that can be updated on an existing artwork. */
type UpdateArtworkData = Partial<
  Omit<ArtworkDoc, "_id" | "createdAt" | "updatedAt" | "colorPalette">
>;

/** Shape returned by tag collection queries for slug resolution. */
interface TagRefDoc {
  _id: ObjectId;
  slug: string;
}

// ── Collection accessor ───────────────────────────────────────────────────

function collection() {
  return getDb().then((db) => db.collection<ArtworkDoc>("artworks"));
}

// ── Helpers ───────────────────────────────────────────────────────────────

function docToArtwork(doc: ArtworkDoc): Artwork {
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    medium: doc.medium,
    type: doc.type,
    nsfw: doc.nsfw,
    featured: doc.featured,
    featuredOrder: doc.featuredOrder,
    images: doc.images,
    timelapse: doc.timelapse,
    tagIds: doc.tagIds.map((id) => id.toHexString()),
    completionDate: doc.completionDate.toISOString(),
    colorPalette: doc.colorPalette,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Minimal shape available after the feed projection. */
interface ProjectedArtworkDoc {
  _id: ObjectId;
  slug: string;
  title: string;
  medium: string;
  type: "personal" | "commission";
  nsfw: boolean;
  completionDate: Date;
  images: ImageAsset[];
  tagIds: ObjectId[];
}

function docToListItem(
  doc: ProjectedArtworkDoc,
  tagSlugs: string[],
): ArtworkListItem {
  const cover = doc.images[0] ?? {
    publicId: "",
    width: 0,
    height: 0,
  };
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    title: doc.title,
    medium: doc.medium,
    type: doc.type,
    nsfw: doc.nsfw,
    completionDate: doc.completionDate.toISOString(),
    coverImage: {
      publicId: cover.publicId,
      width: cover.width,
      height: cover.height,
    },
    tagSlugs,
  };
}

function encodeCursor(sortValue: Date, _id: ObjectId): string {
  const payload: CursorPayload = {
    sortValue: sortValue.toISOString(),
    _id: _id.toHexString(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function decodeCursor(cursor: string): { sortValue: Date; _id: ObjectId } | null {
  try {
    const raw = Buffer.from(cursor, "base64").toString("utf8");
    const parsed: CursorPayload = JSON.parse(raw);
    return {
      sortValue: new Date(parsed.sortValue),
      _id: new ObjectId(parsed._id),
    };
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────

const ARTWORK_PROJECTION = {
  _id: 1,
  slug: 1,
  title: 1,
  medium: 1,
  type: 1,
  nsfw: 1,
  completionDate: 1,
  images: { $slice: 1 },
  tagIds: 1,
} as const;

/**
 * Create a new artwork document.
 *
 * @param data - The artwork fields (minus server-managed timestamps).
 * @returns The created artwork with string ids.
 */
export async function createArtwork(
  data: CreateArtworkData,
): Promise<Artwork> {
  // Validate internal data shape before writing to MongoDB
  ArtworkCreateInternalSchema.parse(data);
  const now = new Date();
  const doc: ArtworkDoc = {
    _id: new ObjectId(),
    ...data,
    colorPalette: null,
    createdAt: now,
    updatedAt: now,
  };
  const col = await collection();
  await col.insertOne(doc);
  return docToArtwork(doc);
}

/**
 * Update an existing artwork document.
 *
 * @param id - The 24-character hex string id.
 * @param data - Subset of fields to update.
 * @returns The updated artwork, or null if not found.
 */
export async function updateArtwork(
  id: string,
  data: UpdateArtworkData,
): Promise<Artwork | null> {
  // Validate partial internal data shape before writing to MongoDB
  ArtworkUpdateInternalSchema.parse(data);
  const col = await collection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? docToArtwork(result) : null;
}

/**
 * Delete an artwork document.
 *
 * @param id - The 24-character hex string id.
 * @returns The deleted artwork's tagIds, or null if not found.
 */
export async function deleteArtwork(
  id: string,
): Promise<{ tagIds: string[] } | null> {
  const col = await collection();
  const doc = await col.findOneAndDelete({ _id: new ObjectId(id) });
  if (!doc) return null;
  return { tagIds: doc.tagIds.map((oid) => oid.toHexString()) };
}

/**
 * Look up a single artwork by its slug.
 *
 * @param slug - URL-safe slug.
 * @param includeNsfw - Optional. When true, NSFW artworks are included. Defaults to false.
 * @returns The full artwork, or null.
 */
export async function findArtworkBySlug(
  slug: string,
  includeNsfw = false,
): Promise<Artwork | null> {
  const filter: Filter<ArtworkDoc> = { slug };
  if (!includeNsfw) {
    filter.nsfw = false;
  }
  const col = await collection();
  const doc = await col.findOne(filter);
  return doc ? docToArtwork(doc) : null;
}

/**
 * List artworks for the gallery feed with filtering, sorting, and cursor pagination.
 *
 * Supported filters: tags (AND match), year, medium, type, nsfw.
 * Sort modes: "recent" (completionDate desc, _id desc) or "oldest" (completionDate asc, _id asc).
 * Defaults: limit 24, max 60, sort "recent", nsfw "exclude".
 */
export async function listArtworks(params: {
  tags?: string[];
  year?: number;
  medium?: string;
  type?: "personal" | "commission";
  nsfw?: "include" | "exclude";
  sort?: "recent" | "oldest";
  cursor?: string;
  limit?: number;
}): Promise<{
  items: ArtworkListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 60);
  const sort: Sort = params.sort === "oldest"
    ? { completionDate: 1, _id: 1 }
    : { completionDate: -1, _id: -1 };

  const filter: Filter<ArtworkDoc> = {};

  // NSFW filter — default to exclude
  if (params.nsfw !== "include") {
    filter.nsfw = false;
  }

  if (params.type) {
    filter.type = params.type;
  }

  if (params.medium) {
    filter.medium = params.medium;
  }

  if (params.year) {
    const start = new Date(params.year, 0, 1);
    const end = new Date(params.year + 1, 0, 1);
    filter.completionDate = { $gte: start, $lt: end };
  }

  // Cursor-based pagination
  if (params.cursor) {
    const decoded = decodeCursor(params.cursor);
    if (!decoded) {
      throw new Error("Invalid cursor");
    }
    const { sortValue, _id } = decoded;
    if (params.sort === "oldest") {
      filter.$or = [
        { completionDate: { $gt: sortValue } },
        { completionDate: { $eq: sortValue }, _id: { $gt: _id } },
      ];
    } else {
      filter.$or = [
        { completionDate: { $lt: sortValue } },
        { completionDate: { $eq: sortValue }, _id: { $lt: _id } },
      ];
    }
  }

  const col = await collection();

  // If tags filter is provided, resolve slugs to ObjectIds first
  if (params.tags && params.tags.length > 0) {
    const tagCol = await getDb().then((db) => db.collection<TagRefDoc>("tags"));
    const tagDocs = await tagCol
      .find({ slug: { $in: params.tags } })
      .project<TagRefDoc>({ _id: 1 })
      .toArray();
    const tagObjectIds = tagDocs.map((d) => d._id);
    if (tagObjectIds.length > 0) {
      filter.tagIds = { $all: tagObjectIds };
    } else {
      // None of the requested tags exist — return an empty page deterministically.
      return { items: [], nextCursor: null, hasMore: false };
    }
  }

  // Fetch one extra doc to determine hasMore
  const docs = await col
    .find(filter)
    .project<ProjectedArtworkDoc>(ARTWORK_PROJECTION)
    .sort(sort)
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const pageDocs = hasMore ? docs.slice(0, limit) : docs;

  // Batch-resolve tag names for the page
  const allTagIds = [...new Set(pageDocs.flatMap((d) => d.tagIds.map((id) => id.toHexString())))];
  let tagMap = new Map<string, string>();
  if (allTagIds.length > 0) {
    const tagCol = await getDb().then((db) => db.collection<TagRefDoc>("tags"));
    const tagDocs = await tagCol
      .find({ _id: { $in: allTagIds.map((s) => new ObjectId(s)) } })
      .project<TagRefDoc>({ _id: 1, slug: 1 })
      .toArray();
    tagMap = new Map(
      tagDocs.map((d) => [d._id.toHexString(), d.slug]),
    );
  }

  const items = pageDocs.map((doc) =>
    docToListItem(doc, doc.tagIds.map((id) => tagMap.get(id.toHexString()) ?? "")),
  );

  // Build next cursor from the last doc in the returned page
  let nextCursor: string | null = null;
  if (hasMore) {
    const last = pageDocs[pageDocs.length - 1];
    nextCursor = encodeCursor(last.completionDate, last._id);
  }

  return { items, nextCursor, hasMore };
}

/**
 * Find all featured artworks, sorted by featuredOrder ascending.
 * NSFW artworks are always excluded (featured section is public-facing).
 */
export async function findFeaturedArtworks(): Promise<ArtworkListItem[]> {
  const col = await collection();
  const docs = await col
    .find({ featured: true, nsfw: false })
    .project<ProjectedArtworkDoc>(ARTWORK_PROJECTION)
    .sort({ featuredOrder: 1 })
    .toArray();

  // Batch-resolve tag slugs
  const allTagIds = [...new Set(docs.flatMap((d) => d.tagIds.map((id) => id.toHexString())))];
  let tagMap = new Map<string, string>();
  if (allTagIds.length > 0) {
    const tagCol = await getDb().then((db) => db.collection<TagRefDoc>("tags"));
    const tagDocs = await tagCol
      .find({ _id: { $in: allTagIds.map((s) => new ObjectId(s)) } })
      .project<TagRefDoc>({ _id: 1, slug: 1 })
      .toArray();
    tagMap = new Map(
      tagDocs.map((d) => [d._id.toHexString(), d.slug]),
    );
  }

  return docs.map((doc) =>
    docToListItem(doc, doc.tagIds.map((id) => tagMap.get(id.toHexString()) ?? "")),
  );
}