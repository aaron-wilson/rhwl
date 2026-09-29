import { expect, test } from "@playwright/test";

test.describe("links open the demo at a moment in time", () => {
  test("?at on a Saturday shows the exchange closed", async ({ page }) => {
    await page.goto("/trade?at=2026-10-03T21:00:00Z");
    await expect(page.getByText("NYSE closed")).toBeVisible();
  });

  test("?at on a Tuesday afternoon shows the exchange open", async ({ page }) => {
    await page.goto("/trade?at=2026-09-29T17:00:00Z");
    await expect(page.getByText("NYSE open")).toBeVisible();
  });

  test("?scenario=weekend-gap opens on the weekend", async ({ page }) => {
    await page.goto("/trade?scenario=weekend-gap");
    await expect(page.getByText("NYSE closed")).toBeVisible();
  });

  test("after hours is labeled", async ({ page }) => {
    await page.goto("/trade?at=2026-09-29T21:30:00Z");
    await expect(page.getByText("After hours")).toBeVisible();
  });

  test("an invalid time is ignored and the app still loads", async ({ page }) => {
    await page.goto("/trade?at=not-a-date");
    await expect(page.getByRole("heading", { level: 1, name: "Trade" })).toBeVisible();
  });
});
