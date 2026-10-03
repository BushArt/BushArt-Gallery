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
  descriptionPreview: "Seeded artwork for Playwright E2E tests.",
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
  images: [
    { publicId: "bushart/e2e/test-image", url: "https://cdn.example.com/test-image", width: 800, height: 600, order: 0 },
    { publicId: "bushart/e2e/test-image-2", url: "https://cdn.example.com/test-image-2", width: 800, height: 600, order: 1 },
  ],
  timelapse: null,
  tags: [{ id: "65e2e2e2e2e2e2e2e2e2e2e2", name: "E2E Tag", slug: "e2e-tag" }],
  featured: false,
  featuredOrder: null,
};

export const e2eNsfwDetail: ArtworkDetailResponse = {
  ...e2eDetail,
  slug: E2E_NSFW_SLUG,
  title: "E2E NSFW Artwork",
  nsfw: true,
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

export { expect };

/**
 * `cacheComponents: true` makes Next.js stream the homepage through a Suspense
 * boundary. Until React finishes hydrating it parks the streamed copy in a
 * hidden `div[id^="S:"]` placeholder that still contains a full duplicate of
 * the app, so `getByTestId(...)` briefly resolves to 2 elements and Playwright's
 * strict mode throws. The placeholder is gone again after a few hundred
 * milliseconds, but `page.goto()` resolves on the `load` event, which lands
 * *inside* that window — and the placeholder can even be inserted just after
 * `goto()` returns, so a single "is it there yet?" check misses it.
 *
 * Therefore wait for the placeholder to stay absent for a sustained stretch
 * rather than observing absence once. The window is not fixed: the placeholder
 * can appear well after `goto()` resolves (measured as late as ~700ms later),
 * so the poll keeps watching the whole time and restarts its quiet count
 * whenever the placeholder shows up. Assertions keep their exact `getByTestId`
 * scoping (no `.first()`), and if the wait ever times out we fall through so
 * the assertion reports the real failure instead of a vague timeout.
 */
const HYDRATION_POLL_MS = 50;
/** 12 × 50ms ≈ 600ms of continuous absence before we call hydration settled. */
const HYDRATION_SETTLED_POLLS = 12;
const HYDRATION_TIMEOUT_MS = 5_000;

async function waitForHydrationSwap(page: Page): Promise<void> {
  const deadline = Date.now() + HYDRATION_TIMEOUT_MS;
  let stable = 0;

  try {
    // Poll from Node rather than in `page.waitForFunction` so the wait costs a
    // single locator count per tick and cannot throw a browser-side error.
    while (Date.now() < deadline && stable < HYDRATION_SETTLED_POLLS) {
      const pending = await page.locator('div[id^="S:"]').count();
      stable = pending > 0 ? 0 : stable + 1;
      if (stable < HYDRATION_SETTLED_POLLS) {
        await page.waitForTimeout(HYDRATION_POLL_MS);
      }
    }
  } catch {
    // Navigation committed / page closed underneath us: fall through so the
    // assertion reports the real failure instead of a navigation error.
  }
}

// Patching inside the `page` fixture (rather than a `beforeEach` hook) makes
// the guards part of fixture setup, so they are installed before any hook or
// test body can observe the page — a hook is not guaranteed to be registered
// ahead of spec-level hooks, a fixture dependency always is.
export const test = base.extend({
  page: async ({ page }, use) => {
    patchLocatorFactories(page);

    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);

    page.goto = async (url: string, options?: Parameters<Page["goto"]>[1]) => {
      const response = await goto(url, options);
      await waitForHydrationSwap(page);
      return response;
    };

    page.reload = async (options?: Parameters<Page["reload"]>[0]) => {
      const response = await reload(options);
      await waitForHydrationSwap(page);
      return response;
    };

    // Playwright's `use` callback is not a React hook; the rule just sees the
    // `page` fixture name and assumes a function component.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

function escapeTestId(testId: string): string {
  return testId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// `cacheComponents` parks a second copy of the app inside a body-level
// `div[id^="S:"]` placeholder while a streamed Suspense boundary resolves.
// Both copies carry the same `data-testid`, so an unfiltered `getByTestId`
// throws a strict-mode violation, which web-first assertions never retry.
// The parked copy is not reliably `hidden` — during a slow hydration it is
// even visible for a few milliseconds — but it always sits inside the
// placeholder, so exclude that subtree structurally instead of timing it.
// Patching the prototype (not one page object) keeps every page covered.
let prototypePatched = false;

function patchLocatorFactories(page: Page): void {
  if (prototypePatched) return;
  prototypePatched = true;

  const proto = Object.getPrototypeOf(page) as Page;
  const rawGetByTestId = proto.getByTestId;
  proto.getByTestId = function (this: Page, testId: string | RegExp) {
    return typeof testId === "string"
      ? this.locator(`[data-testid="${escapeTestId(testId)}"]:not([id^="S:"] *)`)
      : rawGetByTestId.call(this, testId);
  } as Page["getByTestId"];
}
