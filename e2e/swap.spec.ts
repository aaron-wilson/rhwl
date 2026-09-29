import { expect, test } from "@playwright/test";

test("swap USDG for ETH from Home: quote, sign, confirm", async ({ page }) => {
  await page.goto("/?at=2026-09-29T16:00:00Z");
  await page
    .getByRole("navigation", { name: "Actions" })
    .getByRole("link", { name: "Swap" })
    .click();
  await page.getByRole("textbox", { name: "You pay" }).fill("100");
  await expect(page.getByRole("radio")).toHaveCount(3);
  await expect(page.getByTestId("quote-status")).toContainText("Quote refreshes in");
  await expect(page.getByTestId("swap-out")).toHaveText(/^0\.0\d+$/);

  await page.getByRole("button", { name: "Review swap" }).click();
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet).toContainText("Swap 100 USDG for ETH");
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(sheet).toBeHidden();

  const first = page.getByRole("list", { name: "Transactions" }).getByRole("listitem").first();
  await expect(first).toContainText("Swap USDG for ETH");
  await expect(first).toContainText("Confirmed");
});
