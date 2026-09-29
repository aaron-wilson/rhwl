import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("tax lots export as a CSV with fixed columns", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await page.getByRole("link", { name: /Tax lots/ }).click();
  await expect(page.getByRole("list", { name: "Lots by asset" })).toContainText("NVDA");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("lots-2026-09-29.csv");
  const csv = readFileSync(await download.path(), "utf8");
  const [header, ...rows] = csv.split("\r\n");
  expect(header).toBe("asset,acquired,quantity,cost_usd,sold,proceeds_usd,gain_usd,status");
  expect(rows.some((r) => r.startsWith("NVDA,2026-08-28,"))).toBe(true);
});
