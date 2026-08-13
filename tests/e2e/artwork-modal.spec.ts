import { test, expect } from "@playwright/test";
import { E2E_NSFW_SLUG, E2E_SLUG, E2E_TITLE, mockGalleryApis } from "./fixtures";

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
  test("Escape closes fullscreen but keeps popup open", async ({ page }) => {
    await page.goto(`/artwork/${E2E_SLUG}?nsfw=include`);

    await expect(page.getByTestId("artwork-popup")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("popup-media-trigger").click();
    await expect(page.getByTestId("fullscreen-viewer")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByTestId("fullscreen-viewer")).not.toBeVisible();
    await expect(page.getByTestId("artwork-popup")).toBeVisible();
  });

  test("shows NSFW interstitial on direct NSFW link in SFW mode", async ({ page }) => {
    await page.goto(`/artwork/${E2E_NSFW_SLUG}`);

    await expect(page.getByTestId("nsfw-interstitial")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Sensitive content" })).toBeVisible();
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
