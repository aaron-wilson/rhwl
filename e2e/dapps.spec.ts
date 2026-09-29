import { expect, test } from "@playwright/test";

test("open Apps from Settings and connect Curvefront, switching to Base", async ({ page }) => {
  await page.goto("/settings?at=2026-09-29T16:00:00Z");
  await page.getByRole("link", { name: /^Apps/ }).click();
  await page
    .getByRole("list", { name: "Sites" })
    .getByRole("link", { name: /Curvefront/ })
    .click();
  await expect(page.getByTestId("site-address")).toHaveText("curvefront.xyz");

  await page.getByRole("button", { name: "Connect wallet" }).click();
  const sheet = page.getByRole("dialog", { name: "Connect to Curvefront" });
  await expect(sheet.getByTestId("connect-network")).toHaveText("Switches to Base for this site");
  await sheet.getByRole("button", { name: "Connect", exact: true }).click();

  const session = page.getByTestId("site-session");
  await expect(session).toContainText("you.rh");
  await expect(session).toContainText("Base");
  await page.getByRole("link", { name: "Back to Apps" }).click();
  await expect(
    page.getByRole("list", { name: "Sites" }).getByRole("link", { name: /Curvefront/ }),
  ).toContainText("Connected");
});

for (const site of [
  { name: "Hood Swap", origin: "hoodswap.app", network: "Robinhood Chain" },
  { name: "Lendwell", origin: "lendwell.fi", network: "Arbitrum One" },
  { name: "Curvefront", origin: "curvefront.xyz", network: "Base" },
]) {
  test(`connect, use and disconnect ${site.name}`, async ({ page }) => {
    await page.goto("/browse?at=2026-09-29T16:00:00Z");
    await page.getByRole("textbox", { name: "Site address" }).fill(site.origin);
    await page.getByRole("textbox", { name: "Site address" }).press("Enter");
    await expect(page.getByTestId("site-address")).toHaveText(site.origin);

    await page.getByRole("button", { name: "Connect wallet" }).click();
    const sheet = page.getByRole("dialog", { name: `Connect to ${site.name}` });
    await sheet.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(page.getByTestId("site-session")).toContainText(site.network);

    await page.getByRole("button", { name: "Check my USDG" }).click();
    await expect(page.getByTestId("site-balance")).toContainText(/[\d,.]+ USDG/);

    // Connections live in memory, so move through the app rather than reloading it.
    await page
      .getByRole("navigation", { name: "Primary" })
      .filter({ visible: true })
      .getByRole("link", { name: "Settings" })
      .click();
    await page.getByRole("link", { name: /^Connected sites/ }).click();
    const list = page.getByRole("list", { name: "Connected sites" });
    await expect(list).toContainText(`${site.origin} · you.rh · ${site.network}`);
    await page.getByRole("button", { name: `Disconnect ${site.origin}` }).click();
    await expect(page.getByText("No site is connected.")).toBeVisible();

    await page.goBack();
    await page.goBack();
    await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();
    await expect(page.getByTestId("site-session")).toBeHidden();
  });
}
