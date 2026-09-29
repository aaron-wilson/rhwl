import { expect, test } from "@playwright/test";

test("set a price alert on an asset, and refuse one already passed", async ({ page }) => {
  await page.goto("/asset/rh-NVDA?at=2026-09-29T16:00:00Z&freeze=1");
  const card = page.getByRole("region", { name: "Price alerts" });
  const input = card.getByLabel(/Alert price in dollars/);
  await input.fill("1");
  await card.getByRole("button", { name: "Set alert" }).click();
  await expect(card.getByRole("alert")).toContainText("NVDA is already above $1.00");
  await card.getByText("Falls below").click();
  await input.fill("1");
  await card.getByRole("button", { name: "Set alert" }).click();
  await expect(card.getByRole("list", { name: "NVDA alerts" })).toContainText("Below $1.00");
  await expect(card.getByRole("list", { name: "NVDA alerts" })).toContainText("Armed");
});
