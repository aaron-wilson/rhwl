import { expect, test } from "@playwright/test";

test("Home splits each held meme into its quote's move and its own", async ({ page }) => {
  await page.goto("/?scenario=green-day");
  const summary = page.getByRole("region", { name: "Pair Lens" });
  await expect(summary).toContainText("CHIPDOG");
  await expect(summary).toContainText(/NVDA moved [+−]\d+\.\d{2}% since you bought/);
  await expect(summary).toContainText("the NVDA/AAPL/MSFT basket moved");

  await summary.getByRole("link", { name: /CHIPDOG/ }).click();
  const card = page.getByTestId("pair-lens");
  await expect(card).toContainText("NVDA's move");
  await expect(card).toContainText("CHIPDOG's own move");
});

test("hidden balances hide Pair Lens amounts", async ({ page }) => {
  await page.goto("/?scenario=green-day");
  await page.getByRole("button", { name: /Hide balances/ }).click();
  const summary = page.getByRole("region", { name: "Pair Lens" });
  await expect(summary).toContainText("Hidden amount");
  await expect(summary).not.toContainText("$");
});
