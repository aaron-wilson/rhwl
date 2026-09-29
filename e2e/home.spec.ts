import { expect, test, type Page } from "@playwright/test";

/** Every send stops at the passkey sheet; confirm it and wait for it to close. */
async function confirmPasskey(page: Page) {
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(sheet).toBeHidden();
}

test.describe("Home", () => {
  test("shows the live portfolio with grouped holdings", async ({ page }) => {
    await page.goto("/?at=2026-09-29T19:30:00Z&freeze=1");
    await expect(page.getByTestId("portfolio-total")).toHaveText(/^\$[\d,]+\.\d{2}$/);
    for (const group of ["Stock Tokens", "Crypto", "Memes"]) {
      await expect(page.getByRole("region", { name: group })).toBeVisible();
    }
    await expect(page.getByRole("region", { name: "Stock Tokens" })).toContainText("NVIDIA");
  });

  test("red-day tints the app for a loss and green-day for a gain", async ({ page }) => {
    await page.goto("/?scenario=red-day&freeze=1");
    await expect(page.locator("html")).toHaveAttribute("data-tint", "loss");
    await page.goto("/?scenario=green-day&freeze=1");
    await expect(page.locator("html")).toHaveAttribute("data-tint", "gain");
  });

  test("changing range updates the chart and caption", async ({ page }) => {
    await page.goto("/?at=2026-09-29T19:30:00Z&freeze=1");
    await expect(page.getByRole("slider", { name: "Portfolio value, today" })).toBeVisible();
    await page.locator("label", { hasText: /^1W$/ }).click();
    await expect(page.getByRole("slider", { name: "Portfolio value, past week" })).toBeVisible();
    await expect(page.getByText("past week", { exact: true })).toBeVisible();
  });

  test("scrubbing shows the value at that moment and Escape returns to now", async ({ page }) => {
    await page.goto("/?at=2026-09-29T19:30:00Z&freeze=1");
    const total = page.getByTestId("portfolio-total");
    const now = await total.textContent();
    const chart = page.getByRole("slider", { name: "Portfolio value, today" });
    await chart.focus();
    await page.keyboard.press("Home");
    await expect(total).not.toHaveText(now ?? "");
    await expect(chart).toHaveAttribute("aria-valuetext", /Yesterday.*\$[\d,]+\.\d{2}/);
    await page.keyboard.press("Escape");
    await expect(total).toHaveText(now ?? "");
  });

  test("a pending send lowers the total at once", async ({ page }) => {
    const dollars = (text: string | null) => Number((text ?? "").replace(/[$,]/g, ""));
    const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
    await page.goto("/?at=2026-09-29T19:30:00Z&freeze=1");
    const before = dollars(await page.getByTestId("portfolio-total").textContent());
    await nav.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("link", { name: "Open the styleguide" }).click();
    await page.getByRole("button", { name: "Send 20 USDG" }).click();
    await confirmPasskey(page);
    await page.getByRole("link", { name: "View in Activity" }).click();
    await nav.getByRole("link", { name: "Home" }).click();
    const after = dollars(await page.getByTestId("portfolio-total").textContent());
    // 20 USDG plus a gas fee of a fraction of a cent, at a frozen clock.
    expect(before - after).toBeGreaterThanOrEqual(19.99);
    expect(before - after).toBeLessThanOrEqual(20.02);
  });
});
