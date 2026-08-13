import { test, expect } from "@playwright/test";
import { mockGalleryApis } from "./fixtures";

test.describe("Gallery browse", () => {
  test.beforeEach(async ({ page }) => {
    await mockGalleryApis(page);
    await page.goto("/?nsfw=include");
    await expect(page.getByTestId("gallery-grid")).toBeVisible({ timeout: 15_000 });
  });

  test("filter type updates URL search params", async ({ page }) => {
    await page.getByTestId("filter-type").selectOption("commission");
    await expect(page).toHaveURL(/type=commission/, { timeout: 10_000 });
  });

  test("filter medium updates URL after debounce", async ({ page }) => {
    await page.getByTestId("filter-medium").fill("Gouache");
    await expect(page).toHaveURL(/medium=Gouache/, { timeout: 5_000 });
  });

  test("view mode toggle switches grid to list without full reload", async ({ page }) => {
    await expect(page.getByTestId("gallery-grid")).toBeVisible();
    await page.getByRole("button", { name: "List" }).click();
    await expect(page.getByTestId("gallery-list")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("gallery-grid")).not.toBeVisible();
  });

  test("NSFW toggle persists in localStorage across reload", async ({ page }) => {
    const toggle = page.getByTestId("nsfw-toggle");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    const stored = await page.evaluate(() => localStorage.getItem("bushart-nsfw"));
    expect(stored).toBe("exclude");

    await page.reload();
    await expect(page.getByTestId("gallery-grid")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("nsfw-toggle")).toHaveAttribute("aria-pressed", "false");
  });
});
