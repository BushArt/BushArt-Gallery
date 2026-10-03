import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

const findOne = vi.fn();

vi.mock("@/lib/db/mongodb", async () => {
  const { runWithTransaction } = await import("@/lib/db/transaction");
  const startSession = async () => ({
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    abortTransaction: vi.fn(async () => undefined),
    endSession: vi.fn(async () => undefined),
  });
  return {
    getDb: async () => ({ collection: () => ({ findOne }) }),
    startSession,
    withTransaction: <T,>(fn: (s?: unknown) => Promise<T>): Promise<T> =>
      runWithTransaction(
        startSession as unknown as () => Promise<import("mongodb").ClientSession>,
        fn as (s: import("mongodb").ClientSession | undefined) => Promise<T>,
      ),
  };
});

import { findArtworkPreview } from "@/lib/db/models/artwork";

const oid = () => new ObjectId();

function image(publicId: string, order: number) {
  return {
    publicId,
    url: `https://res.cloudinary.com/test/image/upload/${publicId}`,
    width: 800,
    height: 600,
    order,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockResolvedValue(null);
});

describe("findArtworkPreview", () => {
  it("returns null when the slug is unknown", async () => {
    await expect(findArtworkPreview("missing")).resolves.toBeNull();
  });

  it("selects the lowest-order image as the cover", async () => {
    findOne.mockResolvedValue({
      _id: oid(),
      slug: "moth-study",
      title: "Moth Study",
      nsfw: false,
      images: [image("bushart/uploads/second", 1), image("bushart/uploads/first", 0)],
    });

    const preview = await findArtworkPreview("moth-study");

    expect(preview?.coverImage.publicId).toBe("bushart/uploads/first");
  });

  // The endpoint exists to avoid transferring the full document on every hover.
  it("requests only the preview projection, omitting full-document fields", async () => {
    findOne.mockResolvedValue({
      _id: oid(),
      slug: "moth-study",
      title: "Moth Study",
      nsfw: false,
      images: [image("bushart/uploads/only", 0)],
    });

    await findArtworkPreview("moth-study");

    const options = findOne.mock.calls[0][1] as { projection: Record<string, number> };
    expect(options.projection).toEqual({
      _id: 1,
      slug: 1,
      title: 1,
      description: 1,
      nsfw: 1,
      "images.0": 1,
    });
    // Fields a preview never renders must not be fetched.
    expect(options.projection).not.toHaveProperty("medium");
    expect(options.projection).not.toHaveProperty("tagIds");
    expect(options.projection).not.toHaveProperty("timelapse");
  });

  it("constrains the query to the requested slug", async () => {
    await findArtworkPreview("moth-study");

    expect(findOne.mock.calls[0][0]).toMatchObject({ slug: "moth-study" });
  });

  it("excludes NSFW artwork by default", async () => {
    await findArtworkPreview("moth-study");

    expect(findOne.mock.calls[0][0]).toMatchObject({ nsfw: false });
  });

  it("omits the nsfw constraint when an admin asks for it", async () => {
    await findArtworkPreview("moth-study", true);

    expect(findOne.mock.calls[0][0]).not.toHaveProperty("nsfw");
  });

  it("truncates a long description to 160 characters plus an ellipsis", async () => {
    findOne.mockResolvedValue({
      _id: oid(),
      slug: "moth-study",
      title: "Moth Study",
      nsfw: false,
      description: "x".repeat(400),
      images: [image("bushart/uploads/only", 0)],
    });

    const preview = await findArtworkPreview("moth-study");

    expect(preview?.descriptionPreview).toHaveLength(161);
    expect(preview?.descriptionPreview?.endsWith("…")).toBe(true);
  });

  it("returns a null descriptionPreview when the description is absent", async () => {
    findOne.mockResolvedValue({
      _id: oid(),
      slug: "moth-study",
      title: "Moth Study",
      nsfw: false,
      images: [image("bushart/uploads/only", 0)],
    });

    expect((await findArtworkPreview("moth-study"))?.descriptionPreview).toBeNull();
  });

  it("degrades to an empty cover when the artwork has no images", async () => {
    findOne.mockResolvedValue({
      _id: oid(),
      slug: "moth-study",
      title: "Moth Study",
      nsfw: false,
      images: [],
    });

    expect((await findArtworkPreview("moth-study"))?.coverImage).toEqual({
      publicId: "",
      width: 0,
      height: 0,
    });
  });
});