import { expect, test } from "@playwright/test";

test("a holder signs into the NVDA room and reads it", async ({ page }) => {
  await page.goto("/asset/rh-NVDA?at=2026-09-29T16:00:00Z");
  await page.getByRole("link", { name: "Holders' room" }).click();
  await page.getByRole("button", { name: "Prove and join" }).click();
  await page
    .getByRole("dialog", { name: "Sign message" })
    .getByRole("button", { name: "Confirm with passkey" })
    .click();
  await expect(page.getByTestId("room-badge")).toContainText("Diamond hands");
  await expect(page.getByRole("list", { name: "Messages" }).getByRole("listitem")).toHaveCount(25);
  await expect(page.getByTestId("sentiment")).toContainText("Bullish");
});

test("a non-holder stays at the gate", async ({ page }) => {
  await page.goto("/rooms/rh-MSFT?at=2026-09-29T16:00:00Z");
  await expect(page.getByRole("note")).toContainText("Only MSFT holders can join.");
});
