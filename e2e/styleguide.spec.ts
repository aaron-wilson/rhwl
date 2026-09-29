import { expect, test } from "@playwright/test";

test.describe("styleguide", () => {
  test("loads by deep link and shows both themes", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByRole("heading", { name: "Styleguide" })).toBeVisible();
    await expect(page.locator('[data-theme="light"]')).toBeVisible();
    await expect(page.locator('[data-theme="dark"]')).toBeVisible();
  });

  test("every measured contrast pair passes", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByText(/:1 pass/).first()).toBeVisible();
    await expect(page.getByText(/:1 fail/)).toHaveCount(0);
  });

  test("theme override beats the OS setting in both directions", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/styleguide");
    const canvas = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    const dark = await canvas();
    await page.locator("label", { hasText: /^Light$/ }).click();
    const light = await canvas();
    expect(light).not.toBe(dark);
    await page.emulateMedia({ colorScheme: "light" });
    await page.locator("label", { hasText: /^Dark$/ }).click();
    expect(await canvas()).toBe(dark);
  });

  test("loss tint swaps the accent", async ({ page }) => {
    await page.goto("/styleguide");
    const accent = () =>
      page.evaluate(() =>
        getComputedStyle(document.querySelector("main") ?? document.body)
          .getPropertyValue("--rh-color-accent")
          .trim(),
      );
    const gain = await accent();
    await page.locator("label", { hasText: /^Loss$/ }).click();
    expect(await accent()).not.toBe(gain);
  });
});
