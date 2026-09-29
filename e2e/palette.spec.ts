import { expect, test } from "@playwright/test";

test("Ctrl+K opens the palette; a typed send opens Send filled in", async ({ page }) => {
  await page.goto("/?at=2026-09-29T16:00:00Z");
  await expect(page.getByTestId("portfolio-total")).toBeVisible();
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Go anywhere" });
  await palette
    .getByRole("combobox", { name: "Search commands" })
    .fill("send 20 USDG to stonks.rh");
  await expect(palette.getByRole("option").first()).toContainText("Send 20 USDG to stonks.rh");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/send\?to=stonks\.rh/);
  await expect(page.getByRole("textbox", { name: "Amount in USDG" })).toHaveValue("20");

  await page.keyboard.press("Control+k");
  await palette.getByRole("combobox", { name: "Search commands" }).fill("buy NVDA");
  await expect(palette.getByRole("option").first()).toContainText("Trade NVDA");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/asset\/rh-NVDA/);
});

test("arrow keys pick a result, and settings change in place", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: "Search commands" });
  await input.fill("theme");
  await input.press("ArrowDown");
  await expect(page.getByRole("option", { name: /Theme: Dark/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await input.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the search button opens the palette, and ? lists the shortcuts", async ({ page }) => {
  await page.goto("/?at=2026-09-29T16:00:00Z");
  await page.getByRole("button", { name: "Search (⌘K)" }).filter({ visible: true }).click();
  const input = page.getByRole("combobox", { name: "Search commands" });
  await input.fill("nvda room");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/rooms\/rh-NVDA/);
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toContainText(
    "Open the command palette",
  );
});
