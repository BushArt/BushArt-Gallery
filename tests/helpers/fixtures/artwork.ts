import { ObjectId } from "mongodb";

/** Fixed IDs shared across API tests — stable for mocked route assertions. */
export const artworkId = new ObjectId().toHexString();
export const tagA = new ObjectId().toHexString();
export const tagB = new ObjectId().toHexString();

export const validImage = {
  publicId: "bushart/artworks/moth/main",
  url: "https://res.cloudinary.com/test/image/upload/main",
  width: 100,
  height: 100,
  order: 0,
};

export function makeBaseArtwork(overrides: Record<string, unknown> = {}) {
  return {
    id: artworkId,
    slug: "moth-study",
    title: "Moth Study",
    description: "Desc",
    medium: "Gouache",
    type: "personal" as const,
    nsfw: false,
    completionDate: "2024-03-01T00:00:00.000Z",
    images: [validImage],
    timelapse: null,
    tagIds: [tagA],
    featured: false,
    featuredOrder: null,
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
    ...overrides,
  };
}

export function makeCreateArtworkBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Moth Study",
    description: "Desc",
    medium: "Gouache",
    type: "personal",
    nsfw: false,
    completionDate: "2024-03-01T00:00:00.000Z",
    images: [validImage],
    tagIds: [tagA],
    ...overrides,
  };
}
