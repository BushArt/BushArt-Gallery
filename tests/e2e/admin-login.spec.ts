import { test, expect } from "./fixtures";
import { mockGalleryApis } from "./fixtures";

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

  return {
    setAuthenticated(value: boolean) {
      authenticated = value;
    },
  };
}

test.describe("Admin login", () => {
  test("footer glyph opens login modal and successful login unlocks admin UI", async ({ page }) => {
    await mockGalleryApis(page);
    await mockAuthRoutes(page);

    await page.goto("/");
    await expect(page.getByTestId("admin-login-trigger")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("admin-login-trigger").click();
    await expect(page.getByTestId("login-modal")).toBeVisible();
    await page.getByTestId("login-username").fill("admin");
    await page.getByTestId("login-password").fill("secret");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-modal")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("upload-card")).toBeVisible({ timeout: 10_000 });
  });

  test("Shift+Alt+L opens login modal", async ({ page }) => {
    await mockGalleryApis(page);
    await mockAuthRoutes(page);

    await page.goto("/");
    await expect(page.getByTestId("admin-login-trigger")).toBeVisible({ timeout: 15_000 });
    await page.locator("body").click();
    await page.keyboard.press("Shift+Alt+KeyL");
    await expect(page.getByTestId("login-modal")).toBeVisible({ timeout: 10_000 });
  });

  test("locked account shows inline error", async ({ page }) => {
    await mockGalleryApis(page);
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false }),
      });
    });
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 423,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "LOCKED",
            message: "Account is temporarily locked",
            details: { retryAfterSeconds: 900 },
          },
        }),
      });
    });

    await page.goto("/");
    await expect(page.getByTestId("admin-login-trigger")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("admin-login-trigger").click();
    await page.getByTestId("login-username").fill("admin");
    await page.getByTestId("login-password").fill("wrong");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toContainText(/locked/i);
  });
});
