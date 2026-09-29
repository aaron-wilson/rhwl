import { expect, test } from "@playwright/test";

for (const [day, query] of [
  ["Saturday", "scenario=weekend-gap"],
  ["Sunday", "scenario=weekend-gap&at=2026-10-04T18:00:00Z"],
] as const) {
  test(`buy a Stock Token on ${day}: gap notice, sign, position grows`, async ({ page }) => {
    await page.goto(`/asset/rh-NVDA?${query}`);
    const position = page.getByRole("region", { name: "Your position" });
    await expect(position).toContainText("12.408 NVDA");
    await page.getByRole("button", { name: "Buy" }).click();
    const sheet = page.getByRole("dialog", { name: "Buy NVDA" });
    await expect(sheet.getByTestId("gap-notice")).toContainText("closed for the weekend");
    await expect(sheet.getByText("so one token is worth 1.000054 shares")).toBeVisible();
    await sheet.getByRole("textbox", { name: "Amount in dollars" }).fill("100");
    await sheet.getByRole("button", { name: "Review buy" }).click();

    const sign = page.getByRole("dialog", { name: "Confirm with passkey" });
    await expect(sign).toContainText("Bought");
    await sign.getByRole("button", { name: "Confirm with passkey" }).click();
    await expect(page.getByRole("region", { name: "Activity" })).toContainText("Confirmed");
    await expect(position).not.toContainText("12.408 NVDA");
  });
}
