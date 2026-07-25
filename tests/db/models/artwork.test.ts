import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

const oid = (hex = "65a1f2b3c4d5e6f7a8b9c0d1") => new ObjectId(hex);

function createMockCollection<T extends { _id: ObjectId }>() {
  let docs: T[] = [];

  const base = {
    async insertOne(doc: T) { docs.push(doc); },
    async findOne(filter: any) {
      return docs.find((d: any) => {
        if (filter._id) {
          if (filter._id.$in) {
            if (!filter._id.$in.some((id: any) => d._id?.equals?.(id))) return false;
          } else if (!d._id?.equals?.(filter._id)) return false;
        }
        if (filter.slug && d.slug !== filter.slug) return false;
        if (filter.nsfw !== undefined && d.nsfw !== filter.nsfw) return false;
        if (filter.type && d.type !== filter.type) return false;
        if (filter.medium && d.medium !== filter.medium) return false;
        if (filter.completionDate) {
          const cd = filter.completionDate;
          if (cd.$gte && d.completionDate < cd.$gte) return false;
          if (cd.$lt && d.completionDate >= cd.$lt) return false;
        }
        return true;
      }) ?? null;
    },
    async findOneAndDelete(filter: any) {
      const idx = docs.findIndex((d: any) => d._id?.equals?.(filter._id) ?? false);
      if (idx === -1) return null;
      return docs.splice(idx, 1)[0];
    },
    async findOneAndUpdate(filter: any, update: any, opts: any) {
      const idx = docs.findIndex((d: any) => d._id?.equals?.(filter._id) ?? false);
      if (idx === -1) return null;
      const current = docs[idx];
      const next = { ...current, ...update.$set };
      if (opts?.returnDocument === "after" || opts?.returnDocument === "returnDocument") {
        next._id = current._id;
        docs[idx] = next as T;
        return next;
      }
      docs[idx] = next as T;
      return current;
    },
    async updateOne(filter: any, update: any, opts?: { upsert?: boolean }) {
      if (filter && Object.keys(filter).length > 0) {
        const idx = docs.findIndex((d: any) => d._id?.equals?.(filter._id) ?? false);
        if (idx === -1 && opts?.upsert) {
          docs.push({ _id: new ObjectId(), ...(update.$set ?? {}) } as T);
          return;
        }
        if (idx !== -1) docs[idx] = { ...docs[idx], ...update.$set };
      } else if (docs.length > 0) {
        docs[0] = { ...docs[0], ...update.$set };
      } else if (opts?.upsert) {
        docs.push({ _id: new ObjectId(), ...(update.$set ?? {}) } as T);
      }
    },
    async updateMany(filter: any, update: any) {
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i] as any;
        let matches = false;
        if (filter._id) {
          if (filter._id.$in) {
            matches = filter._id.$in.some((id: any) => d._id?.equals?.(id));
          } else {
            matches = d._id?.equals?.(filter._id);
          }
        } else if (filter.tagIds) {
          matches = d.tagIds?.some((id: ObjectId) => id.equals(filter.tagIds));
        }
        if (matches) {
          if (update.$set) docs[i] = { ...docs[i], ...update.$set };
          if (update.$inc) {
            const inc = update.$inc;
            const next: any = { ...docs[i] };
            for (const [key, val] of Object.entries(inc)) {
              next[key] = (next[key] ?? 0) + (val as number);
            }
            docs[i] = next;
          }
          if (update.$pull) {
            docs[i] = {
              ...docs[i],
              tagIds: d.tagIds.filter((id: ObjectId) => !id.equals(update.$pull.tagIds)),
            };
          }
        }
      }
    },
    find(_filter: any) {
      const filter = _filter ?? {};
      const filtered = docs.filter((d: any) => {
        // Evaluate all filter clauses; a doc must pass every one.
        const matchesId = !filter._id
          ? true
          : filter._id.$in
            ? filter._id.$in.some((id: any) => d._id?.equals?.(id))
            : d._id?.equals?.(filter._id);
        if (!matchesId) return false;

        if (filter.slug?.$in && !filter.slug.$in.some((v: any) => d.slug === v)) return false;
        if (!filter.slug?.$in && filter.slug && d.slug !== filter.slug) return false;

        const matchesNsfw = filter.nsfw === undefined || d.nsfw === filter.nsfw;
        if (!matchesNsfw) return false;

        const matchesType = !filter.type || d.type === filter.type;
        if (!matchesType) return false;

        const matchesMedium = !filter.medium || d.medium === filter.medium;
        if (!matchesMedium) return false;

        if (filter.tagIds?.$all) {
          const required = filter.tagIds.$all as ObjectId[];
          const matchesTags = required.every((id) => d.tagIds?.some((t: ObjectId) => t.equals(id)));
          if (!matchesTags) return false;
        }

        let matchesDate = true;
        if (filter.completionDate) {
          const cd = filter.completionDate;
          if (cd.$gte && d.completionDate < cd.$gte) matchesDate = false;
          if (cd.$lt && d.completionDate >= cd.$lt) matchesDate = false;
        }
        if (!matchesDate) return false;

        let matchesOr = true;
        if (filter.$or) {
          matchesOr = filter.$or.some((or: any) => {
            if (or.completionDate?.$gt) return d.completionDate > or.completionDate.$gt;
            if (or.completionDate?.$lt) return d.completionDate < or.completionDate.$lt;
            if (or.completionDate?.$eq && or._id) {
              const eqDate = new Date(or.completionDate.$eq);
              const idHex = d._id?.toHexString?.();
              // or._id may be a direct value (string/ObjectId) or a sub-operator { $gt: ..., $lt: ... }
              const cursorIdHex = or._id.$gt
                ? (typeof or._id.$gt === "string" ? or._id.$gt : or._id.$gt.toHexString())
                : or._id.$lt
                  ? (typeof or._id.$lt === "string" ? or._id.$lt : or._id.$lt.toHexString())
                  : (typeof or._id === "string" ? or._id : or._id.toHexString());
              const cmp = or._id.$gt ? idHex > cursorIdHex : or._id.$lt ? idHex < cursorIdHex : idHex === cursorIdHex;
              return d.completionDate.getTime() === eqDate.getTime() && cmp;
            }
            if (or._id && or._id.$gt) {
              const cursorIdHex = typeof or._id.$gt === "string" ? or._id.$gt : or._id.$gt.toHexString();
              return (d._id?.toHexString?.() ?? "") > cursorIdHex;
            }
            if (or._id && or._id.$lt) {
              const cursorIdHex = typeof or._id.$lt === "string" ? or._id.$lt : or._id.$lt.toHexString();
              return (d._id?.toHexString?.() ?? "") < cursorIdHex;
            }
            return false;
          });
        }
        return matchesOr;
      });

      let state = { docs: filtered };

      const cursor: any = {
        sort(_sort: any) {
          const sorted = [...state.docs];
          const keys = Object.keys(_sort);
          const dirs = keys.map((k) => _sort[k] === -1 ? -1 : 1);
          sorted.sort((a: any, b: any) => {
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              const dir = dirs[i];
              const aVal = key === '_id' ? a[key]?.toHexString?.() : a[key];
              const bVal = key === '_id' ? b[key]?.toHexString?.() : b[key];
              if (aVal instanceof Date && bVal instanceof Date) {
                const diff = dir * (aVal.getTime() - bVal.getTime());
                if (diff !== 0) return diff;
                continue;
              }
              if (typeof aVal === 'string' && typeof bVal === 'string') {
                const diff = dir * aVal.localeCompare(bVal);
                if (diff !== 0) return diff;
                continue;
              }
              if (aVal < bVal) return -dir;
              if (aVal > bVal) return dir;
            }
            return 0;
          });
          state.docs = sorted;
          return cursor;
        },
        project(_proj: any) { return cursor; },
        limit(_limit: number) {
          state.docs = state.docs.slice(0, _limit);
          return cursor;
        },
        async toArray() { return state.docs; },
      };
      return cursor;
    },
    async toArray() { return [...docs]; },
  };

  return base as any;
}

type Collections = Record<string, ReturnType<typeof createMockCollection<any>>>;
let collections: Collections = {};

vi.mock("@/lib/db/mongodb", () => ({
  getDb: () =>
    Promise.resolve({
      collection: (name: string) => {
        if (!collections[name]) {
          collections[name] = createMockCollection<any>();
        }
        return collections[name];
      },
    }),
}));

beforeEach(() => {
  collections = {};
});

import {
  createArtwork,
  updateArtwork,
  deleteArtwork,
  findArtworkBySlug,
  listArtworks,
  findFeaturedArtworks,
} from "@/lib/db/models/artwork";
import { createTag, listTags, findTagBySlug, findTagById, deleteTag, incrementTagUsageCounts, decrementTagUsageCounts } from "@/lib/db/models/tag";
import { createAdmin, findByUsername, findAdminById, updateLoginState, hashPassword, verifyPassword } from "@/lib/db/models/admin";
import { findSettings, upsertSettings } from "@/lib/db/models/settings";

describe("models/artwork", () => {
  it("createArtwork sets server fields and returns string ids", async () => {
    const created = await createArtwork({
      slug: "test-art",
      title: "Test",
      description: null,
      medium: "Digital",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 100, height: 100, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });

    expect(created.id).toBeTruthy();
    expect(created.slug).toBe("test-art");
    expect(created.featuredOrder).toBeNull();
    expect(created.colorPalette).toBeNull();
  });

  it("findArtworkBySlug round-trips id as a hex string", async () => {
    const created = await createArtwork({
      slug: "roundtrip",
      title: "Roundtrip",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });

    const found = await findArtworkBySlug("roundtrip");
    expect(found?.id).toBe(created.id);
  });

  it("updateArtwork returns null when missing", async () => {
    const result = await updateArtwork(oid().toHexString(), { title: "Nope" });
    expect(result).toBeNull();
  });

  it("deleteArtwork returns tagIds", async () => {
    const created = await createArtwork({
      slug: "to-delete",
      title: "Delete",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });

    const deleted = await deleteArtwork(created.id);
    expect(deleted?.tagIds).toEqual([]);
  });

  it("findFeaturedArtworks returns empty array when none featured", async () => {
    const result = await findFeaturedArtworks();
    expect(result).toEqual([]);
  });

  it("updateArtwork returns updated artwork on success", async () => {
    const created = await createArtwork({
      slug: "to-update",
      title: "Original",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });

    const updated = await updateArtwork(created.id, { title: "Updated" });
    expect(updated?.title).toBe("Updated");
    expect(updated?.id).toBe(created.id);
  });

  it("listArtworks defaults to exclude NSFW and limit 24", async () => {
    await createArtwork({
      slug: "sfw-a",
      title: "A",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });
    await createArtwork({
      slug: "nsfw-b",
      title: "B",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: true,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "y", url: "v", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });

    const result = await listArtworks({});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].slug).toBe("sfw-a");
    expect(result.hasMore).toBe(false);
  });

  it("listArtworks filters by year", async () => {
    await createArtwork({
      slug: "year-2023",
      title: "2023 Art",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date("2023-06-15"),
    });
    await createArtwork({
      slug: "year-2024",
      title: "2024 Art",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date("2024-06-15"),
    });

    const result = await listArtworks({ year: 2023 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].slug).toBe("year-2023");
  });

  it("listArtworks respects nsfw=include and sort oldest", async () => {
    await createArtwork({
      slug: "old",
      title: "Old",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date("2020-01-01"),
    });
    await createArtwork({
      slug: "new",
      title: "New",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date("2024-01-01"),
    });

    const result = await listArtworks({ nsfw: "include", sort: "oldest" });
    expect(result.items[0].slug).toBe("old");
    expect(result.items[1].slug).toBe("new");
  });

  it("listArtworks returns nextCursor when more results exist", async () => {
    for (let i = 0; i < 25; i++) {
      await createArtwork({
        slug: `art-${i}`,
        title: `Art ${i}`,
        description: null,
        medium: "Oil",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
        timelapse: null,
        tagIds: [],
        completionDate: new Date(2024, 0, i + 1),
      });
    }

    const result = await listArtworks({ limit: 24 });
    expect(result.items).toHaveLength(24);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeTruthy();
  });

  it("findArtworkBySlug excludes NSFW by default", async () => {
    await createArtwork({
      slug: "nsfw-slug",
      title: "NSFW",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: true,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });

    const found = await findArtworkBySlug("nsfw-slug");
    expect(found).toBeNull();
  });

  it("findArtworkBySlug includes NSFW when includeNsfw is true", async () => {
    await createArtwork({
      slug: "nsfw-slug-2",
      title: "NSFW 2",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: true,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });

    const found = await findArtworkBySlug("nsfw-slug-2", true);
    expect(found?.slug).toBe("nsfw-slug-2");
  });

  it("listArtworks filters by tags", async () => {
    const tagA = await createTag({ name: "A", slug: "a" });
    const tagB = await createTag({ name: "B", slug: "b" });

    await createArtwork({
      slug: "only-a",
      title: "Only A",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [oid(tagA.id)],
      completionDate: new Date("2024-01-01"),
    });
    await createArtwork({
      slug: "only-b",
      title: "Only B",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [oid(tagB.id)],
      completionDate: new Date("2024-02-01"),
    });
    await createArtwork({
      slug: "both-ab",
      title: "Both AB",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [oid(tagA.id), oid(tagB.id)],
      completionDate: new Date("2024-03-01"),
    });

    const result = await listArtworks({ tags: ["a"] });
    expect(result.items).toHaveLength(2);
    expect(result.items.map(i => i.slug).sort()).toEqual(["both-ab", "only-a"]);
    expect(result.hasMore).toBe(false);
  });

  it("listArtworks returns empty page when no tags match", async () => {
    await createArtwork({
      slug: "only-art",
      title: "Only",
      description: null,
      medium: "Oil",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [],
      completionDate: new Date(),
    });

    const result = await listArtworks({ tags: ["no-such-tag"] });
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});

describe("models/tag", () => {
  it("createTag returns usageCount 0", async () => {
    const tag = await createTag({ name: "Gouache", slug: "gouache" });
    expect(tag.usageCount).toBe(0);
    expect(tag.slug).toBe("gouache");
  });

  it("listTags returns created tags sorted by name", async () => {
    await createTag({ name: "Zebra", slug: "zebra" });
    await createTag({ name: "Apple", slug: "apple" });
    const tags = await listTags();
    expect(tags.map((t) => t.slug)).toEqual(["apple", "zebra"]);
  });

  it("findTagBySlug and findTagById round-trip", async () => {
    const tag = await createTag({ name: "Roundtrip", slug: "roundtrip" });
    const bySlug = await findTagBySlug("roundtrip");
    expect(bySlug?.id).toBe(tag.id);

    const byId = await findTagById(tag.id);
    expect(byId?.slug).toBe("roundtrip");
  });

  it("decrementTagUsageCounts adjusts counts downward", async () => {
    const tag = await createTag({ name: "Count", slug: "count" });
    await incrementTagUsageCounts([tag.id]);
    await incrementTagUsageCounts([tag.id]);
    expect((await findTagById(tag.id))?.usageCount).toBe(2);

    await decrementTagUsageCounts([tag.id]);
    expect((await findTagById(tag.id))?.usageCount).toBe(1);
  });

  it("deleteTag cascades to artworks", async () => {
    const tag = await createTag({ name: "Cascade", slug: "cascade" });
    await createArtwork({
      slug: "cascade-art",
      title: "Cascade",
      description: null,
      medium: "Digital",
      type: "personal",
      nsfw: false,
      featured: false,
      featuredOrder: null,
      images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
      timelapse: null,
      tagIds: [oid(tag.id)],
      completionDate: new Date(),
    });

    const deleted = await deleteTag(tag.id);
    expect(deleted).toBe(true);

    // Verify cascade: the artwork's tagIds no longer contains the deleted tag
    const artwork = await findArtworkBySlug("cascade-art");
    expect(artwork?.tagIds).not.toContain(tag.id);
  });

  it("listArtworks oldest sort with cursor paginates correctly", async () => {
    // Use distinct dates so cursor boundary is purely date-based (no _id tiebreaker needed)
    for (let i = 0; i < 5; i++) {
      await createArtwork({
        slug: `cursor-oldest-${i}`,
        title: `Oldest Cursor ${i}`,
        description: null,
        medium: "Oil",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
        timelapse: null,
        tagIds: [],
        completionDate: new Date(2024, 0, i + 1),
      });
    }

    const page1 = await listArtworks({ sort: "oldest", limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await listArtworks({ sort: "oldest", limit: 2, cursor: page1.nextCursor! });
    expect(page2.items).toHaveLength(2);
    expect(page2.hasMore).toBe(true);

    const page3 = await listArtworks({ sort: "oldest", limit: 2, cursor: page2.nextCursor! });
    expect(page3.items).toHaveLength(1);
    expect(page3.hasMore).toBe(false);
    expect(page3.nextCursor).toBeNull();

    // Verify total ordering across pages
    const allSlugs = [...page1.items, ...page2.items, ...page3.items].map((i) => i.slug);
    expect(allSlugs).toEqual([
      "cursor-oldest-0",
      "cursor-oldest-1",
      "cursor-oldest-2",
      "cursor-oldest-3",
      "cursor-oldest-4",
    ]);
  });

  it("listArtworks cursor tiebreaker on _id for identical completionDate", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const created = await createArtwork({
        slug: `same-date-${i}`,
        title: `Same ${i}`,
        description: null,
        medium: "Oil",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
        timelapse: null,
        tagIds: [],
        completionDate: new Date("2024-06-15T12:00:00Z"),
      });
      ids.push(created.id);
    }

    const page1 = await listArtworks({ sort: "recent", limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await listArtworks({ sort: "recent", limit: 2, cursor: page1.nextCursor! });
    expect(page2.items).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.items, ...page2.items].map(i => i.id);
    expect(allIds).toEqual(expect.arrayContaining(ids));
  });

  it("listArtworks recent sort with cursor paginates correctly", async () => {
    for (let i = 0; i < 5; i++) {
      await createArtwork({
        slug: `cursor-recent-${i}`,
        title: `Recent Cursor ${i}`,
        description: null,
        medium: "Oil",
        type: "personal",
        nsfw: false,
        featured: false,
        featuredOrder: null,
        images: [{ publicId: "x", url: "u", width: 1, height: 1, order: 0 }],
        timelapse: null,
        tagIds: [],
        completionDate: new Date(2024, 0, i + 1),
      });
    }

    const page1 = await listArtworks({ sort: "recent", limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await listArtworks({ sort: "recent", limit: 2, cursor: page1.nextCursor! });
    expect(page2.items).toHaveLength(2);
    expect(page2.hasMore).toBe(true);

    const page3 = await listArtworks({ sort: "recent", limit: 2, cursor: page2.nextCursor! });
    expect(page3.items).toHaveLength(1);
    expect(page3.hasMore).toBe(false);
    expect(page3.nextCursor).toBeNull();

    const allSlugs = [...page1.items, ...page2.items, ...page3.items].map((i) => i.slug);
    expect(allSlugs).toEqual([
      "cursor-recent-4",
      "cursor-recent-3",
      "cursor-recent-2",
      "cursor-recent-1",
      "cursor-recent-0",
    ]);
  });
});

describe("models/admin", () => {
  it("createAdmin + findByUsername round-trip", async () => {
    await createAdmin({ username: "alice", passwordHash: "hash" });
    const found = await findByUsername("alice");
    expect(found?.username).toBe("alice");
    expect(found?.passwordHash).toBe("hash");
  });

  it("findAdminById returns the admin", async () => {
    const admin = await createAdmin({ username: "carol", passwordHash: "hash" });
    const found = await findAdminById(admin.id);
    expect(found?.username).toBe("carol");
  });

  it("updateLoginState updates fields", async () => {
    const admin = await createAdmin({ username: "bob", passwordHash: "hash" });
    await updateLoginState(admin.id, {
      failedLoginAttempts: 3,
      lockUntil: null,
      lastLoginAt: new Date(),
    });
    const updated = await findByUsername("bob");
    expect(updated?.failedLoginAttempts).toBe(3);
    expect(updated?.lastLoginAt).toBeTruthy();
  });

  it("hashPassword and verifyPassword round-trip through bcrypt", async () => {
    const hash = await hashPassword("secret");
    expect(hash).not.toBe("secret");
    expect(await verifyPassword("secret", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("models/settings", () => {
  it("findSettings returns null when missing", async () => {
    const found = await findSettings();
    expect(found).toBeNull();
  });

  it("upsertSettings preserves omitted fields on partial update", async () => {
    const created = await upsertSettings({
      artistName: "Bush",
      tagline: "Original tagline",
      socialLinks: [{ platform: "x", url: "https://x.com/bush" }],
      contactEmail: "bush@example.com",
    });
    expect(created.tagline).toBe("Original tagline");
    expect(created.socialLinks).toHaveLength(1);
    expect(created.contactEmail).toBe("bush@example.com");

    const updated = await upsertSettings({ artistName: "Bush Updated" });
    expect(updated.artistName).toBe("Bush Updated");
    expect(updated.tagline).toBe("Original tagline");
    expect(updated.socialLinks).toHaveLength(1);
    expect(updated.contactEmail).toBe("bush@example.com");
  });
});
