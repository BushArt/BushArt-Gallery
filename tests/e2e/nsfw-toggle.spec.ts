import { test, expect } from "./fixtures";
import { mockGalleryApis } from "./fixtures";

async function mockAuthAsAdmin(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "admin1", username: "admin" }),
    });
  });
}

test.describe("NSFW toggle", () => {
  test("toggles NSFW preference and persists across page reload", async ({ page }) => {
    await mockGalleryApis(page);
    await mockAuthAsAdmin(page);

    await page.goto("/");
    await expect(page.getByTestId("nsfw-toggle")).toBeVisible({ timeout: 15_000 });

    // Initially NSFW is off
    await expect(page.getByTestId("nsfw-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Toggle NSFW on
    await page.getByTestId("nsfw-toggle").click();
    await expect(page.getByTestId("nsfw-toggle")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Verify persistence across reload
    await page.reload();
    await expect(page.getByTestId("nsfw-toggle")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("nsfw-toggle")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Toggle NSFW back off
    await page.getByTestId("nsfw-toggle").click();
    await expect(page.getByTestId("nsfw-toggle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("NSFW toggle filters NSFW artworks from gallery", async ({ page }) => {
    await mockGalleryApis(page);
    await mockAuthAsAdmin(page);

    let showNsfw = false;

    await page.route("**/api/artworks?*", async (route, request) => {
      if (request.method() !== "GET") {
        await route.continue();
        return;
      }
      const url = new URL(request.url());
      const nsfwParam = url.searchParams.get("nsfw");
      showNsfw = nsfwParam === "include";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: showNsfw
            ? [
                {
                  id: "65e2e2e2e2e2e2e2e2e2e2e4",
                  slug: "nsfw-art",
                  title: "NSFW Artwork",
                  medium: "Digital",
                  type: "personal",
                  nsfw: true,
                  completionDate: "2026-03-01T00:00:00.000Z",
                  coverImage: {
                    publicId: "bushart/e2e/nsfw-image",
                    width: 800,
                    height: 600,
                  },
                  descriptionPreview: "NSFW test artwork",
                  tagSlugs: [],
                },
              ]
            : [],
          nextCursor: null,
          hasMore: false,
        }),
      });
    });

    await page.goto("/");
    await expect(page.getByTestId("nsfw-toggle")).toBeVisible({ timeout: 15_000 });

    // Initially NSFW artworks are hidden
    await expect(page.getByText("NSFW Artwork")).not.toBeVisible();

    // Toggle NSFW on
    await page.getByTestId("nsfw-toggle").click();
    await expect(page.getByTestId("nsfw-toggle")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // NSFW artwork should now be visible
    await expect(page.getByText("NSFW Artwork")).toBeVisible({
      timeout: 10_000,
    });
  });
});
