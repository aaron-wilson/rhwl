import { expect, test } from "@playwright/test";

test("the gap radar stays hidden while the listing is open", async ({ page }) => {
  await page.goto("/?at=2026-09-29T19:30:00Z&freeze=1");
  await expect(page.getByTestId("portfolio-total")).toBeVisible();
  await expect(page.getByTestId("gap-total")).toHaveCount(0);
});

test("over the weekend the radar sums the drift and opens a detail list", async ({ page }) => {
  await page.goto("/?scenario=weekend-gap&freeze=1");
  const radar = page.getByRole("region", { name: "Weekend gap" });
  await expect(radar).toContainText("since Friday's close");
  await expect(page.getByTestId("gap-total")).toHaveText(/^\+\$/);
  await radar.getByRole("button").click();
  const sheet = page.getByRole("dialog", { name: "Weekend gap" });
  await expect(sheet.getByRole("region", { name: "Stock Tokens" }).getByRole("link")).toHaveCount(
    4,
  );
  await sheet.getByRole("link", { name: /NVIDIA/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "NVIDIA" })).toBeVisible();
});
