import { expect, test } from "@playwright/test";

test("theme and hidden balances survive a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/settings");
  await page.locator("label", { hasText: /^Dark$/ }).click();
  await page.getByRole("switch", { name: /Hide balances/ }).click();
  await page.reload();
  await expect(page.getByRole("switch", { name: /Hide balances/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/");
  await expect(page.getByTestId("portfolio-total")).toHaveText("••••••Hidden amount");
});

test("a saved dark theme paints dark before any app code runs", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/settings");
  await page.locator("label", { hasText: /^Dark$/ }).click();
  const darkCanvas = await page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  );

  // Block every script bundle: only the inline pre-paint script can act.
  await page.route("**/assets/*.js", (route) => route.abort());
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const firstPaint = await page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  );
  expect(firstPaint).toBe(darkCanvas);
});

test("a corrupt snapshot falls back to defaults instead of breaking the app", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("rhwl:v1", "{not json");
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});
