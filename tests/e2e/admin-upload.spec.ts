import { test, expect } from "./fixtures";
import { mockGalleryApis } from "./fixtures";

test.describe("Admin upload", () => {
  test("complete upload flow with inline new tag", async ({ page }) => {
    await mockGalleryApis(page);

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "admin1", username: "admin" }),
      });
    });

    const tags: Array<{ id: string; name: string; slug: string; usageCount: number; createdAt: string }> = [];

    await page.route("**/api/tags", async (route, request) => {
      if (request.method() === "POST") {
        const body = (await request.postDataJSON()) as { name: string };
        const created = {
          id: "65f000000000000000000001",
          name: body.name,
          slug: body.name.toLowerCase().replace(/\s+/g, "-"),
          usageCount: 0,
          createdAt: new Date().toISOString(),
        };
        tags.push(created);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(created),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: tags }),
      });
    });

    await page.route("**/api/upload/signature", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          signature: "sig",
          timestamp: 123,
          apiKey: "key",
          cloudName: "test-cloud",
          folder: "bushart/uploads",
        }),
      });
    });

    await page.route("https://api.cloudinary.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          public_id: "bushart/uploads/test-image",
          secure_url: "https://res.cloudinary.com/demo/image/upload/test.jpg",
          width: 800,
          height: 600,
          resource_type: "image",
        }),
      });
    });

    let createdArtwork = false;
    const newListItem = {
      id: "65f000000000000000000002",
      slug: "new-art",
      title: "New Artwork",
      medium: "Digital",
      completionDate: "2026-03-01T00:00:00.000Z",
      type: "personal" as const,
      nsfw: false,
      coverImage: { publicId: "bushart/uploads/test-image", width: 800, height: 600 },
      descriptionPreview: null,
      tagSlugs: ["fresh-tag"],
    };

    await page.route("**/api/artworks?*", async (route, request) => {
      if (request.method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: createdArtwork ? [newListItem] : [],
          nextCursor: null,
          hasMore: false,
        }),
      });
    });

    await page.route("**/api/artworks", async (route, request) => {
      if (request.method() === "POST") {
        createdArtwork = true;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "65f000000000000000000002", slug: "new-art" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/");
    await expect(page.getByTestId("upload-card")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("upload-card").click();
    await expect(page.getByTestId("upload-dialog")).toBeVisible();

    await page.getByTestId("upload-images-input").setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png"),
    });

    await expect(page.getByText(/1 image\(s\) ready/)).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("upload-title").fill("New Artwork");
    await page.getByTestId("upload-medium").fill("Digital");
    await page.getByTestId("upload-completion-date").fill("2026-03-01");
    await page.getByTestId("tag-picker-input").fill("Fresh Tag");
    await page.getByTestId("tag-create-new").click();
    await page.getByTestId("upload-submit").click();

    await expect.poll(() => createdArtwork).toBe(true);
    await expect(page.getByRole("link", { name: /New Artwork/i })).toBeVisible({ timeout: 15_000 });
  });
});
