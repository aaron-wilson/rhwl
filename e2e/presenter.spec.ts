import { expect, test } from "@playwright/test";

test("Ctrl+. shows presenter mode; a scenario is one step away", async ({ page }) => {
  await page.goto("/?at=2026-09-29T16:00:00Z");
  await expect(page.getByTestId("portfolio-total")).toBeVisible();
  const bar = page.getByRole("region", { name: "Presenter controls" });
  await expect(bar).toBeHidden();
  await page.keyboard.press("Control+.");
  await expect(bar).toBeVisible();
  await expect(bar.getByText("Independent prototype · simulated data")).toBeInViewport();
  await bar.getByRole("combobox", { name: "Scenario" }).selectOption("weekend-gap");
  await expect(page).toHaveURL(/scenario=weekend-gap/);
  await expect(page.getByRole("region", { name: "Presenter controls" })).toBeVisible();
  await page.getByRole("button", { name: "Leave presenter mode" }).click();
  await expect(page.getByRole("region", { name: "Presenter controls" })).toBeHidden();
});

test("a long press on the logo opens presenter mode on desktop", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the logo lives in the desktop sidebar");
  await page.goto("/?at=2026-09-29T16:00:00Z");
  const logo = page.getByRole("link", { name: "Wallet home" });
  await logo.hover();
  await page.mouse.down();
  await expect(page.getByRole("region", { name: "Presenter controls" })).toBeVisible();
  await page.mouse.up();
  await expect(page).toHaveURL(/\/\?at=/);
});

test("the phone frame shows the app at phone size, with its own controls", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the phone frame is a desktop view");
  await page.goto("/?at=2026-09-29T16:00:00Z&presenter=1");
  await page.getByRole("button", { name: "Phone frame" }).click();
  const frame = page.frameLocator('iframe[title="Wallet on a phone"]');
  await expect(frame.getByTestId("portfolio-total")).toBeVisible();
  await expect(frame.getByRole("region", { name: "Presenter controls" })).toBeVisible();
  await expect(frame.getByRole("button", { name: "Phone frame" })).toHaveCount(0);
  await expect(
    frame.getByRole("navigation", { name: "Primary" }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Leave phone frame" }).click();
  await expect(page.getByTestId("portfolio-total")).toBeVisible();
});

test("at 390 px the honesty line has its own row below the controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?at=2026-09-29T16:00:00Z&presenter=1");
  const bar = page.getByRole("region", { name: "Presenter controls" });
  const line = bar.getByText("Independent prototype · simulated data");
  await expect(line).toBeInViewport();
  const close = await bar.getByRole("button", { name: "Leave presenter mode" }).boundingBox();
  const text = await line.boundingBox();
  expect(text?.y).toBeGreaterThanOrEqual((close?.y ?? 0) + (close?.height ?? 0));
  expect(text?.x).toBeGreaterThanOrEqual(0);
  expect((text?.x ?? 0) + (text?.width ?? 0)).toBeLessThanOrEqual(390);
});
