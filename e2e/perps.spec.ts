import { expect, test } from "@playwright/test";

test("a Green-day BTC long shows a profit after fast-forwarding", async ({ page }) => {
  await page.goto("/perps?market=BTC-PERP&scenario=green-day");
  await page.getByRole("textbox", { name: "Margin in USDG" }).fill("1000");
  await expect(page.getByTestId("liq-price")).toHaveText(/^\$[\d,]+\.\d{2}$/);
  await expect(page.getByLabel("Take profit (optional)")).toBeVisible();
  await expect(page.getByLabel("Stop loss (optional)")).toBeVisible();
  await page.getByRole("button", { name: /^Long BTC \d+x$/ }).click();
  await page
    .getByRole("dialog", { name: "Confirm with passkey" })
    .getByRole("button", { name: "Confirm with passkey" })
    .click();
  const position = page.getByRole("region", { name: /long BTC/ });
  await expect(position).toBeVisible();

  // Fast-forward the demo clock from the styleguide's presenter controls, then come back.
  const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
  await nav.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("link", { name: "Open the styleguide" }).click();
  await page.getByRole("button", { name: "Advance 5 min" }).click();
  await page.goBack();
  await page.goBack();
  // Five idle minutes also trip the default auto-lock.
  await page.getByRole("button", { name: "Unlock with passkey" }).click();
  await expect(position.getByTestId("position-pnl")).toHaveText(/^\+\$/);
});

test("the what-if slider shows the order liquidated at a deep enough shock", async ({ page }) => {
  await page.goto("/perps?market=BTC-PERP&scenario=green-day");
  await page.getByLabel("Margin in USDG").fill("100");
  const shock = page.getByRole("slider", { name: /Price shock for/ });
  await shock.focus();
  await page.keyboard.press("PageUp");
  await expect(page.getByTestId("whatif-outcome")).toContainText("from liquidation");
  await page.keyboard.press("Home");
  await expect(page.getByTestId("whatif-outcome")).toContainText("Liquidated at");
});
