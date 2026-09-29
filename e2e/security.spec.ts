import { expect, test } from "@playwright/test";

test("every one-tap fix raises the security score to 100", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await page.getByRole("link", { name: /^Security/ }).click();
  const meter = page.getByRole("meter", { name: "Security score" });
  const score = page.getByTestId("security-score");
  await expect(meter).toHaveAttribute("aria-valuenow", "30");
  await expect(page.getByRole("list", { name: "Security checklist" })).toContainText(
    "0x7a2c…3f19 imitates stonks.rh",
  );

  await page.getByRole("button", { name: "Set trade limits" }).click();
  await expect(score).toHaveText("45");
  await page.getByRole("button", { name: "Flag as scams" }).click();
  await expect(score).toHaveText("60");

  await page.getByRole("button", { name: "Verify with passkey" }).click();
  const message = page.getByRole("dialog", { name: "Sign message" });
  await expect(message.getByLabel("Message")).toContainText("This moves no funds");
  await message.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(score).toHaveText("80");

  await page.getByRole("button", { name: "Revoke risky approvals" }).click();
  await page
    .getByRole("dialog", { name: "Confirm with passkey" })
    .getByRole("button", { name: "Confirm with passkey" })
    .click();
  await expect(score).toHaveText("100");
  await expect(meter).toHaveAttribute("aria-valuenow", "100");
});
