import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("a signed card verifies from its link, and an edited one does not", async ({
  page,
  browser,
}) => {
  await page.goto("/asset/rh-NVDA?scenario=green-day");
  await page.getByRole("button", { name: "Flex this position" }).click();
  const flex = page.getByRole("dialog", { name: "Positions or ban" });
  await expect(flex.getByTestId("flex-pnl")).toHaveText(/^[+−]\d+\.\d{2}%$/);
  await flex.getByRole("button", { name: "Sign card" }).click();

  const sign = page.getByRole("dialog", { name: "Sign message" });
  await expect(sign.getByLabel("Message")).toContainText("I held NVDA at");
  await sign.getByRole("button", { name: "Confirm with passkey" }).click();
  const link = await flex.getByTestId("verify-link").textContent();
  expect(link).toContain("/verify?card=");

  // A fresh browser context has none of this wallet's state.
  const cold = await (await browser.newContext()).newPage();
  await cold.goto(link ?? "");
  await expect(cold.getByTestId("verify-result")).toHaveText("Verified: signed by you.rh");

  const url = new URL(link ?? "");
  const text = Buffer.from(url.searchParams.get("card") ?? "", "base64url").toString("utf8");
  const edited = text.replace(/"pnlBps":"(-?)\d+"/, '"pnlBps":"$19999"');
  url.searchParams.set("card", Buffer.from(edited, "utf8").toString("base64url"));
  await cold.goto(url.href);
  await expect(cold.getByTestId("verify-result")).toContainText("Not verified");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`the signed card saves as a PNG in ${colorScheme} mode`, async ({ browser }) => {
    const page = await (await browser.newContext({ colorScheme })).newPage();
    await page.goto("/asset/rh-NVDA?scenario=green-day");
    await page.getByRole("button", { name: "Flex this position" }).click();
    const flex = page.getByRole("dialog", { name: "Positions or ban" });
    await flex.getByRole("button", { name: "Sign card" }).click();
    await page
      .getByRole("dialog", { name: "Sign message" })
      .getByRole("button", { name: "Confirm with passkey" })
      .click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      flex.getByRole("button", { name: "Save image" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^NVDA-\d{4}-\d{2}-\d{2}\.png$/);
    const png = readFileSync(await download.path());
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.length).toBeGreaterThan(5_000);
  });
}
