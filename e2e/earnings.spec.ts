import { expect, test } from "@playwright/test";

test("the earnings-night scenario leads from Home to NVDA's night view", async ({ page }) => {
  await page.goto("/?scenario=earnings-night");
  await page.getByRole("link", { name: /NVDA reports tonight/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "NVDA earnings" })).toBeVisible();
  const exposure = page.getByTestId("exposure");
  await expect(exposure).toContainText("NVDA tokens");
  await expect(exposure).toContainText("CHIPDOG (paired)");
  await expect(exposure).toContainText("Combined");
  const shock = page.getByRole("slider", { name: /Price shock for NVDA/ });
  await shock.focus();
  await page.keyboard.press("End");
  await expect(page.getByTestId("whatif-outcome")).toContainText(/moves \+\$[\d,]+\.\d{2}/);
});
