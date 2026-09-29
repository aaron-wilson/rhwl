import { expect, test } from "@playwright/test";

test("switching accounts changes Home without a reload", async ({ page }) => {
  await page.goto("/?at=2026-09-29T19:30:00Z&freeze=1");
  const total = page.getByTestId("portfolio-total");
  const main = await total.textContent();
  await page
    .getByRole("button", { name: /Switch account/ })
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Accounts" })
    .getByRole("button", { name: /Degen/ })
    .click();
  await expect(total).not.toHaveText(main ?? "");
  await expect(page.getByRole("region", { name: "Memes" })).toContainText("Tendies");
  await expect(page.getByRole("region", { name: "Stock Tokens" })).toHaveCount(0);
});

test("pair a Ledger, then every transaction asks to confirm on the device", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
  await page.goto("/?at=2026-09-29T19:30:00Z");
  await page
    .getByRole("button", { name: /Switch account/ })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Add hardware wallet" }).click();
  await page.getByRole("button", { name: "Ledger Nano X" }).click();
  await expect(page.getByTestId("pairing-address")).toHaveText(/^0x[0-9a-f]{40}$/);
  await page.getByRole("button", { name: "It matches" }).click();
  await expect(page.getByText("Ledger Nano X paired")).toBeVisible();
  await expect(page.getByRole("region", { name: "Stock Tokens" })).toContainText("S&P 500 ETF");

  await nav.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("link", { name: "Open the styleguide" }).click();
  await page.getByRole("button", { name: "Send 20 USDG" }).click();
  const sheet = page.getByRole("dialog", { name: "Confirm on device" });
  await expect(sheet).toContainText("Review and approve on your Ledger Nano X");
  await sheet.getByRole("button", { name: "Approve on device" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId("usdg-balance")).toHaveText("2,480 USDG");
});
