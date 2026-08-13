import { test, expect } from "@playwright/test";
import { E2E_NSFW_SLUG, E2E_SLUG, E2E_TITLE, e2eNsfwDetail, mockGalleryApis } from "./fixtures";

test.describe("Artwork modal entry paths", () => {
  test("opens modal via in-app card click without full reload", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/?nsfw=include");

    await expect(page.getByTestId("gallery-grid")).toBeVisible({ timeout: 15_000 });
    const cardLink = page.getByRole("link", { name: new RegExp(E2E_TITLE) });
    await expect(cardLink).toBeVisible();

    await Promise.all([
      page.waitForURL(new RegExp(`/artwork/${E2E_SLUG}`), { timeout: 15_000 }),
      cardLink.click(),
    ]);

    await expect(page.getByTestId("artwork-popup")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: E2E_TITLE, level: 2 })).toBeVisible();
    await expect(page.getByTestId("gallery-grid")).toBeVisible();
  });

  test("server-renders full page with popup on direct URL visit", async ({ page }) => {
    await page.goto(`/artwork/${E2E_SLUG}?nsfw=include`);

    await expect(page.getByTestId("artwork-popup")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: E2E_TITLE, level: 2 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Gallery" })).toBeVisible();
  });
});

test.describe("Artwork popup interactions", () => {
  test("Escape closes popup and returns to gallery URL", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/?nsfw=include");

    await expect(page.getByTestId("gallery-grid")).toBeVisible({ timeout: 15_000 });
    const cardLink = page.getByRole("link", { name: new RegExp(E2E_TITLE) });
    await Promise.all([
      page.waitForURL(new RegExp(`/artwork/${E2E_SLUG}`), { timeout: 15_000 }),
      cardLink.click(),
    ]);

    await expect(page.getByTestId("artwork-popup")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");

    await expect(page.getByTestId("artwork-popup")).not.toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/?(\?|$)/);
  });

  test("backdrop closes popup", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto(`/artwork/${E2E_SLUG}?nsfw=include`);

    await expect(page.getByTestId("artwork-popup")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("modal-backdrop").click({ position: { x: 8, y: 8 }, force: true });

    await expect(page.getByTestId("artwork-popup")).not.toBeVisible({ timeout: 10_000 });
  });

  test("Escape closes fullscreen but keeps popup open", async ({ page }) => {
    await page.goto(`/artwork/${E2E_SLUG}?nsfw=include`);

    await expect(page.getByTestId("artwork-popup")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("popup-media-trigger").click();
    await expect(page.getByTestId("fullscreen-viewer")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByTestId("fullscreen-viewer")).not.toBeVisible();
    await expect(page.getByTestId("artwork-popup")).toBeVisible();
  });

  test("NSFW confirm reveals artwork media", async ({ page }) => {
    await mockGalleryApis(page);
    await page.route(`**/api/artworks/${E2E_NSFW_SLUG}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(e2eNsfwDetail),
      });
    });

    await page.goto(`/artwork/${E2E_NSFW_SLUG}`);

    await expect(page.getByTestId("nsfw-interstitial")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("nsfw-confirm").click();

    await expect(page.getByTestId("nsfw-interstitial")).not.toBeVisible();
    await expect(page.getByTestId("popup-media-trigger")).toBeVisible();
  });

  test("NSFW go back closes popup", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto(`/artwork/${E2E_NSFW_SLUG}`);

    await expect(page.getByTestId("nsfw-interstitial")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Go back" }).click();

    await expect(page.getByTestId("artwork-popup")).not.toBeVisible({ timeout: 10_000 });
  });

  test("multi-image thumbnails switch active image", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto(`/artwork/${E2E_SLUG}?nsfw=include`);

    await expect(page.getByTestId("image-thumbnails")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "View image 2" }).click();
    await expect(page.getByRole("button", { name: "View image 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("download button links to download API", async ({ page }) => {
    await page.goto(`/artwork/${E2E_SLUG}?nsfw=include`);

    await expect(page.getByTestId("download-button")).toBeVisible({ timeout: 15_000 });
    const href = await page.getByTestId("download-button").getAttribute("href");
    expect(href).toMatch(new RegExp(`/api/artworks/${E2E_SLUG}/download\\?image=`));
  });

  test("share shows clipboard confirmation", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });

    await page.goto(`/artwork/${E2E_SLUG}?nsfw=include`);

    await expect(page.getByTestId("share-button")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("share-button").click();

    await expect(page.getByTestId("share-confirmation")).toBeVisible();
    await expect(page.getByTestId("share-confirmation")).toHaveText(/copied/i);
  });
});
