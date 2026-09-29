import { expect, test } from "@playwright/test";

test("fast-forwarding past the auto-lock locks the app and hides every amount", async ({
  page,
}) => {
  await page.goto("/styleguide?at=2026-09-29T19:30:00Z&freeze=1");
  await expect(page.getByTestId("usdg-balance")).toBeVisible();
  await page.getByRole("button", { name: "Advance 5 min" }).click();
  await expect(page.getByRole("heading", { name: "Wallet locked" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("USDG");
  await expect(page.locator("body")).not.toContainText("$");
  await page.getByRole("button", { name: "Unlock with passkey" }).click();
  await expect(page.getByTestId("usdg-balance")).toBeVisible();
});

test("Lock now in Settings", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Lock now" }).click();
  await expect(page.getByRole("heading", { name: "Wallet locked" })).toBeVisible();
  await page.getByRole("button", { name: "Unlock with passkey" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});
