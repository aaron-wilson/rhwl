import { expect, test } from "@playwright/test";

test("a basket is built by weight, bought in one signature and rebalanced", async ({ page }) => {
  await page.goto("/trade?at=2026-09-29T16:00:00Z");
  await page.getByRole("link", { name: /Tendies Index/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tendies Index" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Allocation" })).toContainText("CHIPDOG");

  await page.getByRole("button", { name: "Review 4 buys" }).click();
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet.getByRole("list", { name: "4 steps, one signature" })).toBeVisible();
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "into Tendies Index confirmed" }),
  ).toBeAttached();

  // The basket counts everything held of its members, so earlier holdings put it off target.
  const drift = page.getByTestId("drift");
  await expect(drift).toContainText("Off target by up to");
  await page.getByRole("button", { name: "Rebalance" }).click();
  await page
    .getByRole("dialog", { name: "Confirm with passkey" })
    .getByRole("button", { name: "Confirm with passkey" })
    .click();
  await expect(drift).toContainText("Nothing to do");
});
