import { expect, test } from "@playwright/test";

test("link the Robinhood account, deposit cash as USDG, see it in Activity", async ({ page }) => {
  await page.goto("/?at=2026-09-29T16:00:00Z");
  await page
    .getByRole("navigation", { name: "Actions" })
    .getByRole("link", { name: "Transfer" })
    .click();
  await expect(page.getByRole("region", { name: "Robinhood account" })).toContainText("Custodial");
  await page.getByRole("button", { name: "Link Robinhood account" }).click();
  await expect(page.getByRole("region", { name: "Robinhood account" })).toContainText(
    "12,480.55 USDG",
  );

  await page.getByRole("textbox", { name: "Amount in USDG" }).fill("250");
  await page.getByRole("button", { name: "Move to wallet" }).click();
  await expect(page.getByRole("region", { name: "you.rh" })).toContainText("8,370 USDG");
  await expect(page.getByRole("region", { name: "Robinhood account" })).toContainText(
    "12,230.55 USDG",
  );

  await page
    .getByRole("navigation", { name: "Primary" })
    .filter({ visible: true })
    .getByRole("link", { name: "Activity" })
    .click();
  await expect(
    page.getByRole("list", { name: "Transactions" }).getByRole("listitem").first(),
  ).toContainText("Deposited USDG from Robinhood");
});
