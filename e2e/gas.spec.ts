import { expect, test } from "@playwright/test";

test("pay the network fee in NVDA through the paymaster", async ({ page }) => {
  await page.goto("/send?to=stonks.rh&asset=rh%3AUSDG&amount=5&at=2026-09-29T16:00:00Z");
  await page.getByRole("button", { name: "Review and send" }).click();
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await sheet.getByRole("button", { name: "Change fee" }).click();
  await sheet
    .getByRole("radiogroup", { name: "Pay fee with" })
    .getByRole("radio", { name: /NVDA/ })
    .click();
  await expect(sheet.getByTestId("sign-fee")).toHaveText(/NVDA$/);
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Activity" })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Transactions" }).getByRole("listitem").first(),
  ).toContainText("Confirmed");
});
