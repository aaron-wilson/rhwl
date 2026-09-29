import { expect, test } from "@playwright/test";

test("a missing page chunk shows the boundary, and Try again recovers", async ({ page }) => {
  await page.route("**/assets/*Perps*.js", (route) => route.abort());
  await page.goto("/perps");
  // Retry once, reload once, then the boundary: the shell stays around it.
  await expect(page.getByRole("heading", { name: "This page didn't load" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary" }).filter({ visible: true }),
  ).toBeVisible();

  await page.unroute("**/assets/*Perps*.js");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("textbox", { name: "Margin in USDG" })).toBeVisible();
});
