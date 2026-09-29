import { expect, test } from "@playwright/test";

test("a holding opens its asset page, which shows the position and past trades", async ({
  page,
}) => {
  await page.goto("/?at=2026-09-29T19:30:00Z&freeze=1");
  await page
    .getByRole("region", { name: "Stock Tokens" })
    .getByRole("link", { name: /NVIDIA/ })
    .click();
  await expect(page).toHaveURL(/\/asset\/rh-NVDA$/);
  await expect(page.getByRole("heading", { level: 1, name: "NVIDIA" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Your position" })).toContainText("12.408 NVDA");
  await expect(page.getByRole("region", { name: "Activity" })).toContainText("Bought");

  await page.getByRole("slider", { name: /NVIDIA price/ }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByTestId("asset-price")).not.toBeEmpty();

  await page.getByRole("link", { name: "Home" }).first().click();
  await expect(page.getByTestId("portfolio-total")).toBeVisible();
});

test("an asset the account doesn't hold shows an empty position", async ({ page }) => {
  await page.goto("/asset/rh-MSFT?at=2026-09-29T19:30:00Z&freeze=1");
  await expect(page.getByRole("region", { name: "Your position" })).toContainText(
    "You don't hold any MSFT",
  );
});

test("over the weekend a stock token shows the closed listing and its premium", async ({
  page,
}) => {
  await page.goto("/asset/rh-NVDA?scenario=weekend-gap");
  const clock = page.getByRole("region", { name: "Market clock" });
  await expect(clock).toContainText("Closed for the weekend");
  await expect(clock).toContainText(/Opens in 1d 2\dh/);
  await expect(page.getByTestId("market-gap")).toContainText("premium to Friday's close");
  await expect(page.getByTestId("shares-per-token")).toHaveText("1.000054");
});
