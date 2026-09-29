import { expect, test } from "@playwright/test";

test("receive from Home: QR code, copy to the real clipboard, and a request link", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?at=2026-09-29T16:00:00Z");
  await page
    .getByRole("navigation", { name: "Actions" })
    .getByRole("link", { name: "Receive" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Receive" })).toBeVisible();
  const qr = page.getByRole("img", { name: /QR code for you\.rh's Robinhood Chain address/ });
  await expect(qr).toBeVisible();
  const address = await page.getByTestId("receive-address").textContent();
  expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);

  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Address copied" })).toBeAttached();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);

  await page.getByRole("textbox", { name: "Amount" }).fill("25");
  const request = page.getByTestId("request-link");
  await expect(request).toContainText("Opens Send with 25 USDG to you.rh filled in.");
  await expect(request.getByRole("img")).toHaveAttribute("data-qr-value", /\/send\?to=0x/);
});
