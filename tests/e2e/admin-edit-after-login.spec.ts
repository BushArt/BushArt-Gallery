import { test, expect } from "./fixtures";
import { E2E_SLUG, E2E_TITLE, mockGalleryApis } from "./fixtures";

async function mockAuthRoutes(page: import("@playwright/test").Page) {
  let authenticated = false;

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        authenticated ? { id: "admin1", username: "admin" } : { authenticated: false },
      ),
    });
  });

  await page.route("**/api/auth/login", async (route) => {
    authenticated = true;
    await route.fulfill({ status: 200, body: "" });
  });
}

test.describe("Admin edit after login", () => {
  test("login on homepage then open artwork modal shows Edit button", async ({ page }) => {
    await mockGalleryApis(page);
    await mockAuthRoutes(page);

    await page.goto("/?nsfw=include");
    await expect(page.getByTestId("admin-login-trigger")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("admin-login-trigger").click();
    await page.getByTestId("login-username").fill("admin");
    await page.getByTestId("login-password").fill("secret");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-modal")).not.toBeVisible({ timeout: 10_000 });

    const cardLink = page.getByRole("link", { name: new RegExp(E2E_TITLE) });
    await Promise.all([
      page.waitForURL(new RegExp(`/artwork/${E2E_SLUG}`), { timeout: 15_000 }),
      cardLink.click(),
    ]);

    await expect(page.getByTestId("artwork-popup")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("artwork-edit-button")).toBeVisible({ timeout: 10_000 });
  });
});
