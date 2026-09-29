import { expect, test } from "@playwright/test";

test("app boots to Home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
});
