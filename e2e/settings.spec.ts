import { expect, test } from "@playwright/test";

test("switch the display currency to euros and back", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await page.getByText("EUR €").click();
  const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page.getByTestId("portfolio-total")).toHaveText(/^€[\d,]+\.\d{2}$/);
  await nav.getByRole("link", { name: "Settings" }).click();
  await page.getByText("USD $").click();
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page.getByTestId("portfolio-total")).toHaveText(/^\$[\d,]+\.\d{2}$/);
});

test("the currency choice survives a reload", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await page.getByText("GBP £").click();
  await page.goto("/?at=2026-09-29T16:00:00Z");
  await expect(page.getByTestId("portfolio-total")).toHaveText(/^£[\d,]+\.\d{2}$/);
});

test("add a custom network, with each field checked", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await page.getByRole("button", { name: "Add a network" }).click();
  const sheet = page.getByRole("dialog", { name: "Add a network" });
  await sheet.getByLabel("Network name").fill("My testnet");
  await sheet.getByLabel("RPC URL").fill("http://rpc.example.org");
  await sheet.getByLabel("Chain ID").fill("4663");
  await sheet.getByLabel("Currency symbol").fill("TST");
  await sheet.getByRole("button", { name: "Add network" }).click();
  await expect(sheet).toContainText("Use an https:// address with a domain");
  await sheet.getByLabel("RPC URL").fill("https://rpc.example.org");
  await sheet.getByRole("button", { name: "Add network" }).click();
  await expect(sheet).toContainText("Chain ID 4663 is already in use");
  await sheet.getByLabel("Chain ID").fill("777");
  await sheet.getByRole("button", { name: "Add network" }).click();
  await expect(page.getByRole("list", { name: "Networks" })).toContainText(
    "Custom · chain 777 · never contacted",
  );
});

test("Reset demo from Settings puts balances back after a send", async ({ page }) => {
  // Frozen, so the total moves only because of the send; the send shows at once, before it confirms.
  await page.goto("/?at=2026-09-29T16:00:00Z&freeze=1");
  const total = page.getByTestId("portfolio-total");
  const start = await total.textContent();
  await page
    .getByRole("navigation", { name: "Actions" })
    .getByRole("link", { name: "Send" })
    .click();
  await page.getByRole("textbox", { name: "To" }).fill("stonks.rh");
  await page.getByRole("combobox", { name: "Asset" }).selectOption("rh:USDG");
  await page.getByRole("textbox", { name: "Amount in USDG" }).fill("100");
  await page.getByRole("button", { name: "Review and send" }).click();
  await page
    .getByRole("dialog", { name: "Confirm with passkey" })
    .getByRole("button", { name: "Confirm with passkey" })
    .click();
  const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(total).not.toHaveText(start ?? "");

  await nav.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByText("It is not affiliated with Robinhood.")).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page
    .getByRole("dialog", { name: "Reset the demo?" })
    .getByRole("button", { name: "Reset demo" })
    .click();
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(total).toHaveText(start ?? "");
});
