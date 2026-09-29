import { expect, test } from "@playwright/test";

test("bridge SOL from Solana into Robinhood Chain: both legs complete", async ({ page }) => {
  await page.goto("/?at=2026-09-29T16:00:00Z&presenter=1");
  await page
    .getByRole("navigation", { name: "Actions" })
    .getByRole("link", { name: "Bridge" })
    .click();
  await page.getByRole("textbox", { name: /Send SOL on Solana/ }).fill("1");
  await expect(page.getByRole("radiogroup", { name: "Routes" })).toContainText("Hopline relay");
  await page.getByRole("button", { name: "Bridge to Robinhood Chain" }).click();

  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet).toContainText("Bridge 1 SOL to Robinhood Chain · leg 1 of 2");
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();

  const transfer = page.getByTestId("bridge-transfer");
  await expect(transfer).toContainText("arrives in");
  // The relay takes about 20 seconds on the app clock; step through it from the presenter bar.
  const step = page
    .getByRole("region", { name: "Presenter controls" })
    .getByRole("button", { name: "Advance the clock 5 seconds" });
  await expect(async () => {
    await step.click();
    await expect(transfer).toContainText(/Arrived: [\d,.]+ USDG/, { timeout: 500 });
  }).toPass();

  await page
    .getByRole("navigation", { name: "Primary" })
    .filter({ visible: true })
    .getByRole("link", { name: "Activity" })
    .click();
  await expect(page.getByRole("list", { name: "Transactions" })).toContainText(
    "Received USDG from Solana · leg 2 of 2",
  );
});
