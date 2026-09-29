import { expect, test } from "@playwright/test";

const paths = [
  "/",
  "/asset/rh-NVDA",
  "/tendies",
  "/agent",
  "/guardrails",
  "/earnings",
  "/rooms/rh-NVDA",
  "/browse",
  "/security",
];

test("the guided tour visits every stop, finds each target, and finishes", async ({ page }) => {
  await page.goto("/?at=2026-11-18T21:30:00Z&presenter=1");
  await page
    .getByRole("region", { name: "Presenter controls" })
    .getByRole("button", { name: "Tour" })
    .click();
  const card = page.getByRole("dialog", { name: "Tour" });
  for (const [i, path] of paths.entries()) {
    await expect(card).toContainText(`Step ${i + 1} of ${paths.length}`);
    await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}(\\?|$)`));
    await expect(card).toHaveAttribute("data-found", "true");
    await expect(page.getByTestId("tour-spotlight")).toBeVisible();
    if (i === 1) {
      await card.getByRole("button", { name: "Back" }).click();
      await expect(card).toContainText("Step 1 of");
      await card.getByRole("button", { name: "Next" }).click();
      await expect(card).toContainText("Step 2 of");
    }
    await card.getByRole("button", { name: i === paths.length - 1 ? "Finish" : "Next" }).click();
  }
  await expect(card).toBeHidden();
});
