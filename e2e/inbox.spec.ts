import { expect, test } from "@playwright/test";

test("the market opening lands in the inbox and the bell counts it", async ({ page }) => {
  await page.goto("/?at=2026-09-30T13:29:57Z&freeze=1&presenter=1");
  const bell = page.getByRole("link", { name: /^Inbox/ }).filter({ visible: true });
  await expect(bell).toHaveAccessibleName("Inbox");
  await page
    .getByRole("region", { name: "Presenter controls" })
    .getByRole("button", { name: "Advance the clock 5 seconds" })
    .click();
  await expect(bell).toHaveAccessibleName("Inbox, 1 unread");
  await bell.click();
  const list = page.getByRole("list", { name: "Notifications" });
  await expect(list).toContainText("The market is open");
  await list.getByRole("link", { name: /The market is open/ }).click();
  await expect(page).toHaveURL(/\/trade/);
});
