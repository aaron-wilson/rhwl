import { expect, test, type Page } from "@playwright/test";

/** Every send stops at the passkey sheet; confirm it and wait for it to close. */
async function confirmPasskey(page: Page) {
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(sheet).toBeHidden();
}

const balance = (page: import("@playwright/test").Page) => page.getByTestId("usdg-balance");
const advance = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Advance 5 s" }).click();

test.describe("transaction lifecycle", () => {
  test("a send moves the balance at once, confirms, and lands in Activity", async ({ page }) => {
    await page.goto("/styleguide?at=2026-09-29T16:00:00Z&freeze=1");
    await expect(balance(page)).toHaveText("8,120 USDG");
    await page.getByRole("button", { name: "Send 20 USDG" }).click();
    await confirmPasskey(page);
    await expect(balance(page)).toHaveText("8,100 USDG");
    const island = page.getByRole("button", { name: /Send 20 USDG.*Broadcasting/ });
    await expect(island).toBeVisible();
    await island.click();
    await expect(page.locator("ol li").first()).toContainText("Simulated");
    // One 5 s step covers both the 350 ms accept and the 1.4 s confirmation.
    await advance(page);
    await expect(
      page.getByRole("status").filter({ hasText: "Send 20 USDG to Degen: Confirmed" }),
    ).toBeAttached();
    await expect(balance(page)).toHaveText("8,100 USDG");

    await page.getByRole("link", { name: "View in Activity" }).click();
    const list = page.getByRole("list", { name: "Transactions" });
    await expect(list.getByRole("listitem").first()).toContainText("Send USDG to Degen");
    await expect(list.getByRole("listitem").first()).toContainText("Confirmed");
    await expect(list).toContainText("Bought NVDA");
  });

  test("a failed send shows the failure and rolls the balance back", async ({ page }) => {
    await page.goto("/styleguide?at=2026-09-29T16:00:00Z&freeze=1");
    await page.getByRole("button", { name: "Send and fail" }).click();
    await confirmPasskey(page);
    await expect(balance(page)).toHaveText("8,100 USDG");
    await advance(page);
    await expect(
      page.getByRole("status").filter({ hasText: "Send 20 USDG to Degen: Failed" }),
    ).toBeAttached();
    await expect(balance(page)).toHaveText("8,120 USDG");
    await page.getByRole("link", { name: "View in Activity" }).click();
    const first = page.getByRole("list", { name: "Transactions" }).getByRole("listitem").first();
    await expect(first).toContainText("Failed");
    await expect(first).toContainText("Simulated network error");
  });
});

test("Activity lists earlier transactions on a fresh load", async ({ page }) => {
  await page.goto("/activity?at=2026-09-29T16:00:00Z");
  const list = page.getByRole("list", { name: "Transactions" });
  await expect(list.getByRole("listitem")).toHaveCount(5);
  await expect(list).toContainText("Sent USDG to stonks.rh");
  await expect(list).toContainText("Received USDG from 0x7a2c…3f19");
  await expect(list.getByRole("listitem").first()).toContainText("Bought NVDA");
  await expect(list.getByRole("listitem").first()).toContainText("+2.6771 NVDA");
});

test("hidden balances keep amounts out of the island and announcements", async ({ page }) => {
  await page.goto("/styleguide?at=2026-09-29T16:00:00Z");
  await page.evaluate(() => {
    localStorage.setItem(
      "rhwl:v1",
      JSON.stringify({ version: 1, theme: "system", balancesHidden: true }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Send 20 USDG" }).click();
  await confirmPasskey(page);
  const island = page.getByRole("button", { name: /Send USDG to Degen/ });
  await expect(island).toBeVisible();
  await expect(island).not.toContainText("20");
  const status = page.getByRole("status").filter({ hasText: "Send USDG to Degen: Confirmed" });
  await expect(status).toBeAttached();
  await expect(status).not.toContainText("20");
});

test("Reset demo restores genesis balances and clears the island", async ({ page }) => {
  await page.goto("/styleguide?at=2026-09-29T16:00:00Z&freeze=1");
  await page.getByRole("button", { name: "Send 20 USDG" }).click();
  await confirmPasskey(page);
  await expect(balance(page)).toHaveText("8,100 USDG");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(balance(page)).toHaveText("8,120 USDG");
  await expect(page.getByRole("button", { name: /Send 20 USDG.*Broadcasting/ })).toHaveCount(0);
});
