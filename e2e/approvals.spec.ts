import { expect, test } from "@playwright/test";

const toSettings = (page: import("@playwright/test").Page) =>
  page
    .getByRole("navigation", { name: "Primary" })
    .filter({ visible: true })
    .getByRole("link", { name: "Settings" })
    .click();

test("revoke every risky approval in one signature", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await page.getByRole("link", { name: /^Approvals/ }).click();
  const list = page.getByRole("list", { name: "Approvals" });
  await expect(list.getByRole("listitem")).toHaveCount(5);
  await expect(list.getByRole("listitem").first()).toContainText("Dangerous");

  await page.getByRole("button", { name: "Select risky" }).click();
  await page.getByRole("button", { name: "Revoke 3 in one signature" }).click();
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet.getByRole("list", { name: "3 steps, one signature" })).toContainText(
    "Revoke USDC for 0xdead…eef1 on Arbitrum One",
  );
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list).not.toContainText("Dangerous");
});

test("an approval granted to a site shows up, and can be revoked", async ({ page }) => {
  await page.goto("/browse/hood-swap?at=2026-09-29T16:00:00Z");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await page
    .getByRole("dialog", { name: "Connect to Hood Swap" })
    .getByRole("button", { name: "Connect", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable USDG trading" }).click();
  await page
    .getByRole("dialog", { name: "Confirm with passkey" })
    .getByRole("button", { name: "Confirm with passkey" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Allow unlimited USDG spending" }),
  ).toBeVisible();

  await toSettings(page);
  await page.getByRole("link", { name: /^Approvals/ }).click();
  const row = page
    .getByRole("list", { name: "Approvals" })
    .getByRole("listitem")
    .filter({ hasText: "USDG · Hood Swap" });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Unlimited");
  await row.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Revoke 1 in one signature" }).click();
  await page
    .getByRole("dialog", { name: "Confirm with passkey" })
    .getByRole("button", { name: "Confirm with passkey" })
    .click();
  await expect(row).toHaveCount(0);
});
