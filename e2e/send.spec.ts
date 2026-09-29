import { expect, test } from "@playwright/test";

const LOOKALIKE = "0x7a2c5b0e8d1f4a9c6e2b7d03f5a8c1e9b4d23f19";
// The checksummed form of LOOKALIKE with one letter's case flipped.
const BAD_CHECKSUM = "0x7a2C5b0e8D1F4A9c6E2B7D03F5a8c1E9b4d23f19";

test("send by name from Home: sign, confirm and land in Activity", async ({ page }) => {
  await page.goto("/?at=2026-09-29T16:00:00Z");
  await page
    .getByRole("navigation", { name: "Actions" })
    .getByRole("link", { name: "Send" })
    .click();
  await page.getByRole("textbox", { name: "To" }).fill("stonks.rh");
  await expect(page.getByTestId("recipient")).toContainText("stonks.rh · 0x7a2c…3F19");
  await page.getByRole("combobox", { name: "Asset" }).selectOption("rh:USDG");
  await page.getByRole("textbox", { name: "Amount in USDG" }).fill("25");
  await page.getByRole("button", { name: "Review and send" }).click();

  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet).toContainText("Send 25 USDG to stonks.rh");
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(sheet).toBeHidden();

  await expect(page.getByRole("heading", { level: 1, name: "Activity" })).toBeVisible();
  const first = page.getByRole("list", { name: "Transactions" }).getByRole("listitem").first();
  await expect(first).toContainText("Send USDG to stonks.rh");
  await expect(first).toContainText("Confirmed");
});

test("an amount over the balance can't be sent", async ({ page }) => {
  await page.goto("/send?to=stonks.rh&asset=rh%3AUSDG&at=2026-09-29T16:00:00Z");
  await page.getByRole("textbox", { name: "Amount in USDG" }).fill("9000");
  await expect(page.getByTestId("send-problem")).toHaveText("Not enough USDG");
  await expect(page.getByRole("button", { name: "Review and send" })).toBeDisabled();
});

test("a lookalike of a past recipient is stopped until checked", async ({ page }) => {
  await page.goto("/send?asset=rh%3AUSDG&amount=5&at=2026-09-29T16:00:00Z");
  await page.getByRole("textbox", { name: "To" }).fill(LOOKALIKE);
  const alert = page.getByRole("alert").filter({ hasText: "This looks like stonks.rh" });
  await expect(alert).toBeVisible();
  const send = page.getByRole("button", { name: "Review and send" });
  await expect(send).toBeDisabled();
  await alert.getByRole("checkbox").check();
  await expect(send).toBeEnabled();
});

test("a mixed-case address with a bad EIP-55 checksum is refused", async ({ page }) => {
  await page.goto("/send?asset=rh%3AUSDG&amount=5&at=2026-09-29T16:00:00Z");
  await page.getByRole("textbox", { name: "To" }).fill(BAD_CHECKSUM);
  await expect(
    page.getByText("The capital letters don't match this address's checksum"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Review and send" })).toBeDisabled();
});
