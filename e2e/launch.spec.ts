import { expect, test } from "@playwright/test";

const moments = [
  ["on a Tuesday afternoon", "at=2026-09-29T16:00:00Z"],
  ["in the meme-mania scenario", "scenario=meme-mania"],
] as const;

for (const [moment, query] of moments) {
  test(`a buy that fills the curve graduates Tendies ${moment}`, async ({ page }) => {
    await page.goto(`/launch?${query}`);
    await page.getByRole("button", { name: "Graduating soon" }).click();
    const onCurve = page.getByRole("region", { name: "On the curve" });
    await onCurve.getByTestId("launch-card").filter({ hasText: "Tendies" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tendies" })).toBeVisible();

    await page.getByRole("button", { name: "Buy" }).click();
    const sheet = page.getByRole("dialog", { name: "Tendies on the curve" });
    await sheet.getByRole("textbox", { name: "Amount in ETH" }).fill("1");
    await expect(sheet.getByTestId("graduates")).toContainText("graduates to an open pool");
    await sheet.getByRole("button", { name: "Buy on the curve" }).click();
    await page
      .getByRole("dialog", { name: "Confirm with passkey" })
      .getByRole("button", { name: "Confirm with passkey" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Tendies graduated from the curve" }),
    ).toBeAttached();

    const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
    await nav.getByRole("link", { name: "Launch" }).click();
    await expect(
      page
        .getByRole("region", { name: "Graduated" })
        .getByTestId("launch-card")
        .filter({ hasText: "Tendies" }),
    ).toContainText("Just graduated");
  });

  test(`Rug Radar grades a launch and explains it on the meme page ${moment}`, async ({ page }) => {
    await page.goto(`/launch?${query}`);
    const card = page.getByTestId("launch-card").filter({ hasText: "Robotaxi" });
    await expect(card).toContainText("Radar F");
    await card.click();
    const radar = page.getByRole("region", { name: "Rug Radar" });
    await expect(radar.getByLabel("Grade F")).toBeVisible();
    await expect(radar).toContainText("Liquidity is unlocked and can be pulled");
  });
}
