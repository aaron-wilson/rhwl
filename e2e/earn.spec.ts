import { expect, test } from "@playwright/test";

test("deposit into the USDG vault after reading the risks", async ({ page }) => {
  await page.goto("/trade?at=2026-09-29T16:00:00Z");
  await page.getByRole("link", { name: /^Earn 7%/ }).click();
  await page.getByRole("textbox", { name: "Amount in USDG" }).fill("100");
  await page.getByRole("button", { name: "Deposit" }).click();
  const risks = page.getByRole("dialog", { name: "Before you deposit" });
  await risks.getByRole("checkbox").check();
  await risks.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Deposit" }).click();
  await page
    .getByRole("dialog", { name: "Confirm with passkey" })
    .getByRole("button", { name: "Confirm with passkey" })
    .click();
  await expect(page.getByTestId("vault-balance")).toHaveText(/^100(\.\d+)? USDG$/);
  await expect(page.getByTestId("vault-earned")).toContainText("Earned");
});
