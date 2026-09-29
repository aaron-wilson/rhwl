import { expect, test, type Page } from "@playwright/test";

async function openAndConnect(page: Page, origin: string, name: string) {
  await page.goto("/browse?at=2026-09-29T16:00:00Z");
  await page.getByRole("textbox", { name: "Site address" }).fill(origin);
  await page.getByRole("textbox", { name: "Site address" }).press("Enter");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await page
    .getByRole("dialog", { name: `Connect to ${name}` })
    .getByRole("button", { name: "Connect", exact: true })
    .click();
}

test("unlimited approval: flagged on the sign sheet, and it confirms", async ({ page }) => {
  await openAndConnect(page, "hoodswap.app", "Hood Swap");
  await page.getByRole("button", { name: "Enable USDG trading" }).click();
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet).toContainText("Requested by hoodswap.app");
  await expect(sheet).toContainText("Allow unlimited USDG spending");
  await expect(sheet.getByRole("list", { name: "Findings" })).toContainText("unlimited spending");
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Allow unlimited USDG spending" }),
  ).toBeVisible();
});

test("unverified contract: a launchpad call is flagged", async ({ page }) => {
  await openAndConnect(page, "curvefront.xyz", "Curvefront");
  await page.getByRole("button", { name: "Back CURVE with 0.01 ETH" }).click();
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expect(sheet.getByRole("list", { name: "Findings" })).toContainText("not verified");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("a sign-in message is shown as text and signed", async ({ page }) => {
  await openAndConnect(page, "hoodswap.app", "Hood Swap");
  await page.getByRole("button", { name: "Sign in" }).click();
  const sheet = page.getByRole("dialog", { name: "Sign message" });
  await expect(sheet.getByLabel("Message")).toContainText("Sign in to Hood Swap.");
  await expect(sheet.getByRole("list", { name: "Findings" })).toBeHidden();
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Signed for hoodswap.app" }),
  ).toBeVisible();
});

test("phishing domain: the clone is blocked, and leaving is one tap", async ({ page }) => {
  await page.goto("/browse?at=2026-09-29T16:00:00Z");
  await page.getByRole("textbox", { name: "Site address" }).fill("hoodswap-app.com");
  await page.getByRole("textbox", { name: "Site address" }).press("Enter");
  const block = page.getByRole("alertdialog", { name: "Deceptive site ahead" });
  await expect(block).toContainText("hoodswap-app.com is pretending to be hoodswap.app");
  // On screen, not just in the DOM: the heading and the way out are both in view.
  await expect(block.getByRole("heading", { name: "Deceptive site ahead" })).toBeInViewport();
  await expect(block.getByRole("link", { name: "Back to safety" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeHidden();
  await block.getByRole("link", { name: "Back to safety" }).click();
  await expect(page.getByRole("list", { name: "Sites" })).toBeVisible();
});

test("known drainer: past the block on purpose, every finding shows", async ({ page }) => {
  await page.goto("/browse?at=2026-09-29T16:00:00Z");
  await page.getByRole("textbox", { name: "Site address" }).fill("hoodswap-app.com");
  await page.getByRole("textbox", { name: "Site address" }).press("Enter");
  const block = page.getByRole("alertdialog", { name: "Deceptive site ahead" });
  await block.getByText("I know the risk").click();
  await expect(block.getByRole("button", { name: "Proceed anyway" })).toBeDisabled();
  await block.getByRole("checkbox").check();
  await block.getByRole("button", { name: "Proceed anyway" }).click();

  await page.getByRole("button", { name: "Connect wallet" }).click();
  await page
    .getByRole("dialog", { name: "Connect to Hood Swap" })
    .getByRole("button", { name: "Connect", exact: true })
    .click();
  await page.getByRole("button", { name: "Enable USDG trading" }).click();
  const findings = page
    .getByRole("dialog", { name: "Confirm with passkey" })
    .getByRole("list", { name: "Findings" });
  await expect(findings).toContainText("pretending to be hoodswap.app");
  await expect(findings).toContainText("drained other wallets");
  await expect(findings).toContainText("unlimited spending");
});
