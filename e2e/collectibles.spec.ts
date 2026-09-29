import { expect, test } from "@playwright/test";

test("collectibles open from Home and show traits", async ({ page }) => {
  await page.goto("/?at=2026-09-29T16:00:00Z");
  const preview = page.getByRole("region", { name: "Collectibles" });
  await expect(preview).toContainText("5 items");
  await expect(preview).toContainText("2 hidden as spam");
  await preview.getByRole("link").click();
  await page
    .getByRole("list", { name: "Collectibles" })
    .getByRole("link", { name: /Chainlets #412/ })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Chainlets #412" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Artwork for Chainlets #412" })).toBeVisible();
  await expect(page.getByText("1.5% have this")).toBeVisible();
});

test("spam can be burned through the sign sheet and the transaction lifecycle", async ({
  page,
}) => {
  await page.goto("/collectibles?at=2026-09-29T16:00:00Z");
  await page.getByRole("button", { name: "Hidden as spam (2)" }).click();
  const spam = page.getByRole("list", { name: "Spam" });
  await expect(spam).toContainText("It asks you to visit a website");
  const row = spam.getByRole("listitem").filter({ hasText: "Free Mint Pass" });
  await row.getByRole("button", { name: "Burn" }).click();

  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet.getByRole("list", { name: "Balance changes" })).toContainText(
    "Leaves your wallet",
  );
  await expect(sheet.getByRole("list", { name: "Findings" })).toContainText("not verified");
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(sheet).toBeHidden();

  await expect(
    page.getByRole("status").filter({ hasText: "Burned Free Mint Pass #99102 confirmed" }),
  ).toBeAttached();
  await expect(page.getByRole("button", { name: "Hidden as spam (1)" })).toBeVisible();
});

test("a collectible sends through the recipient checks and the sign sheet", async ({ page }) => {
  await page.goto("/collectibles/chainlets-412?at=2026-09-29T16:00:00Z");
  await page.getByRole("button", { name: "Send" }).click();
  const send = page.getByRole("dialog", { name: "Send Chainlets #412" });
  await send.getByRole("textbox", { name: "To" }).fill("stonks.rh");
  await expect(send.getByTestId("recipient")).toContainText("stonks.rh");
  await send.getByRole("button", { name: "Review and send" }).click();

  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet.getByRole("list", { name: "Balance changes" })).toContainText(
    "Leaves your wallet",
  );
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sent Chainlets #412 to stonks.rh confirmed" }),
  ).toBeAttached();
  await expect(page).toHaveURL(/\/collectibles$/);
  await expect(page.getByRole("list", { name: "Collectibles" })).not.toContainText(
    "Chainlets #412",
  );
});
