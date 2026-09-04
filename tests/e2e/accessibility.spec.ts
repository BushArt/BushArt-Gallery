import AxeBuilder from "@axe-core/playwright";
import { test, expect, mockGalleryApis } from "./fixtures";

function criticalViolations(result: Awaited<ReturnType<AxeBuilder["analyze"]>>) {
  return result.violations.filter((violation) => violation.impact === "critical");
}

test.describe("Accessibility", () => {
  test("site and API responses include baseline security headers", async ({ page }) => {
    const pageResponse = await page.goto("/");
    const apiResponse = await page.request.get("/api/auth/me");

    for (const response of [pageResponse, apiResponse]) {
      expect(response).not.toBeNull();
      expect(response?.headers()["x-frame-options"]).toBe("DENY");
      expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    }
  });

  test("gallery has no critical accessibility violations", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/");

    await expect(page.getByRole("img", { name: "E2E Test Artwork" }).first()).toBeAttached();

    const result = await new AxeBuilder({ page }).analyze();

    expect(criticalViolations(result)).toEqual([]);
  });

  test("artwork popup has no critical accessibility violations", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/");
    const cardLink = page.getByRole("link", { name: /E2E Test Artwork/i });
    await expect(cardLink).toBeVisible({ timeout: 15_000 });
    await Promise.all([
      page.waitForURL(/\/artwork\/e2e-test-art/, { timeout: 15_000 }),
      cardLink.click(),
    ]);
    await expect(page.getByTestId("artwork-popup")).toBeVisible({ timeout: 15_000 });

    const result = await new AxeBuilder({ page }).analyze();

    expect(criticalViolations(result)).toEqual([]);
  });

  test("gallery passes the WCAG color contrast audit", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/");

    const result = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();

    expect(result.violations).toEqual([]);
  });

  test("gallery and filters are keyboard operable", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/?nsfw=include");

    const cardLink = page.getByRole("link", { name: /E2E Test Artwork/i });
    await expect(cardLink).toBeVisible({ timeout: 15_000 });
    await cardLink.focus();
    await expect(cardLink).toBeFocused();

    const mediumFilter = page.getByTestId("filter-medium");
    await mediumFilter.focus();
    await mediumFilter.pressSequentially("Gouache");
    await expect(page).toHaveURL(/medium=Gouache/, { timeout: 5_000 });

    const typeFilter = page.getByTestId("filter-type");
    await typeFilter.focus();
    await typeFilter.press("ArrowDown");
    await expect(typeFilter).toHaveValue("personal");

    const listToggle = page.getByRole("button", { name: "List" });
    await listToggle.focus();
    await listToggle.press("Enter");
    await expect(page.getByTestId("gallery-list")).toBeVisible({ timeout: 10_000 });
  });

  test("authenticated admin controls have no critical accessibility violations", async ({
    page,
  }) => {
    await mockGalleryApis(page);
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "admin1", username: "admin" }),
      });
    });
    await page.goto("/");
    await expect(page.getByTestId("upload-card")).toBeVisible();
    await page.getByTestId("upload-card").click();
    await expect(page.getByTestId("upload-dialog")).toBeVisible();

    const result = await new AxeBuilder({ page }).analyze();

    expect(criticalViolations(result)).toEqual([]);
  });

  test("reduced motion omits the sketch trace", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockGalleryApis(page);
    await page.goto("/");

    await expect(page.getByTestId("sketch-trace")).toHaveCount(0);
  });

  test("fullscreen viewer exposes labelled keyboard controls and position announcement", async ({
    page,
  }) => {
    await mockGalleryApis(page);
    await page.goto("/");
    await page.getByRole("link", { name: /E2E Test Artwork/i }).click();
    await expect(page.getByTestId("artwork-popup")).toBeVisible();
    await page.getByRole("button", { name: "Open fullscreen viewer" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close fullscreen viewer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous image" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next image" })).toBeVisible();
    await expect(page.getByText("Image 1 of 2")).toBeAttached();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Image 2 of 2")).toBeAttached();
  });

  test("popup and fullscreen controls are keyboard operable", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/");

    const cardLink = page.getByRole("link", { name: /E2E Test Artwork/i });
    await expect(cardLink).toBeVisible({ timeout: 15_000 });
    await cardLink.focus();
    await cardLink.press("Enter");
    await expect(page.getByRole("heading", { name: "E2E Test Artwork", level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("artwork-popup").last()).toBeVisible({ timeout: 15_000 });

    const mediaTrigger = page.getByTestId("popup-media-trigger");
    await mediaTrigger.focus();
    await mediaTrigger.press("Enter");
    await expect(page.getByTestId("fullscreen-viewer")).toBeVisible();
    await expect(page.getByText("Image 1 of 2")).toBeAttached();

    const nextButton = page.getByTestId("fullscreen-next");
    await nextButton.focus();
    await expect(nextButton).toBeFocused();
    await nextButton.press("Enter");
    await expect(page.getByText("Image 2 of 2")).toBeAttached({ timeout: 15_000 });

    const closeButton = page.getByTestId("fullscreen-close");
    await closeButton.focus();
    await closeButton.press("Enter");
    await expect(page.getByTestId("fullscreen-viewer")).not.toBeVisible();
    await expect(page.getByTestId("artwork-popup")).toBeVisible();
  });

  test("authenticated admin controls are keyboard operable", async ({ page }) => {
    await mockGalleryApis(page);
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "admin1", username: "admin" }),
      });
    });
    await page.goto("/");

    const uploadCard = page.getByTestId("upload-card");
    await expect(uploadCard).toBeVisible({ timeout: 15_000 });
    await uploadCard.focus();
    await uploadCard.press("Enter");
    await expect(page.getByTestId("upload-dialog")).toBeVisible();
    await expect(page.getByTestId("upload-images-input")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("upload-dialog")).not.toBeVisible();
    await expect(uploadCard).toBeFocused();

    const tagManagerButton = page.getByTestId("open-tag-manager");
    await tagManagerButton.focus();
    await tagManagerButton.press("Enter");
    await expect(page.getByTestId("tag-manager-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("tag-manager-modal")).not.toBeVisible();
  });

  test("admin login entry is keyboard operable", async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/");

    const loginTrigger = page.getByTestId("admin-login-trigger");
    await loginTrigger.focus();
    await loginTrigger.press("Enter");
    await expect(page.getByTestId("login-modal")).toBeVisible();
    await expect(page.getByTestId("login-username")).toBeFocused();
  });
});
