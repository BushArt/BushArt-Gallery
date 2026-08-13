import { test as base, expect, type Page, type Route } from "@playwright/test";
import type { ArtworkDetailResponse } from "@/types/api";
import type { ArtworkListItem } from "@/types/artwork";

export const E2E_SLUG = "e2e-test-art";
export const E2E_NSFW_SLUG = "e2e-nsfw-art";
export const E2E_TITLE = "E2E Test Artwork";

export const e2eListItem: ArtworkListItem = {
  id: "65e2e2e2e2e2e2e2e2e2e2e3",
  slug: E2E_SLUG,
  title: E2E_TITLE,
  medium: "Digital",
  completionDate: "2026-03-01T00:00:00.000Z",
  type: "personal",
  nsfw: false,
  coverImage: { publicId: "bushart/e2e/test-image", width: 800, height: 600 },
  tagSlugs: ["e2e-tag"],
};

export const e2eDetail: ArtworkDetailResponse = {
  id: "65e2e2e2e2e2e2e2e2e2e2e3",
  slug: E2E_SLUG,
  title: E2E_TITLE,
  description: "Seeded artwork for Playwright E2E tests.",
  medium: "Digital",
  type: "personal",
  nsfw: false,
  completionDate: "2026-03-01T00:00:00.000Z",
  images: [{ publicId: "bushart/e2e/test-image", width: 800, height: 600, order: 0 }],
  timelapse: null,
  tags: [{ id: "65e2e2e2e2e2e2e2e2e2e2e2", name: "E2E Tag", slug: "e2e-tag" }],
};

export async function mockGalleryApis(page: Page) {
  await page.route("**/api/artworks?*", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [e2eListItem],
        nextCursor: null,
        hasMore: false,
      }),
    });
  });
  await page.route(`**/api/artworks/${E2E_SLUG}`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(e2eDetail),
    });
  });
  await page.route("**/api/tags", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "65e2e2e2e2e2e2e2e2e2e2e2",
            name: "E2E Tag",
            slug: "e2e-tag",
            usageCount: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    });
  });
}

export { expect, base as test };
