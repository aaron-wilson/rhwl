import { expect, test } from "@playwright/test";

test("a meme buy over the weekly budget is held with the reason", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await page.getByRole("link", { name: /Guardrails/ }).click();
  await page.getByRole("switch", { name: /Weekly meme budget/ }).click();
  await page.getByText("$100", { exact: true }).click();
  await expect(page.getByTestId("guardrails-status")).toContainText("$0.00 of $100.00");

  // Client-side navigation keeps the session, and with it the guardrails.
  const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("link", { name: "Guardrails" })).toBeVisible();

  await nav.getByRole("link", { name: "Launch" }).click();
  await page.getByRole("button", { name: "Graduating soon" }).click();
  await page
    .getByRole("region", { name: "On the curve" })
    .getByTestId("launch-card")
    .filter({ hasText: "Tendies" })
    .click();
  await page.getByRole("button", { name: "Buy" }).click();
  const sheet = page.getByRole("dialog", { name: "Tendies on the curve" });
  await sheet.getByRole("textbox", { name: "Amount in ETH" }).fill("1");
  await sheet.getByRole("button", { name: "Buy on the curve" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "over your $100.00 weekly meme budget" }),
  ).toBeAttached();
  await expect(page.getByRole("dialog", { name: "Confirm with passkey" })).toBeHidden();
});
