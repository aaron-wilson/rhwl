import { expect, test } from "@playwright/test";

test("a rule compiles, is granted by signature, runs on schedule and stops on the kill switch", async ({
  page,
}) => {
  // Frozen seconds before Friday's 15:00 UTC run; the presenter bar steps past it.
  await page.goto("/agent?at=2026-10-02T14:59:52Z&freeze=1&presenter=1");
  await page.getByLabel("Tell the agent what to do").fill("buy $50 of NVDA every Friday");
  await page.getByRole("button", { name: "Compile rule" }).click();
  const policy = page.getByTestId("policy-card");
  await expect(policy).toContainText("Buy $50.00 of NVDA");
  await expect(policy).toContainText("every Friday");
  await expect(policy).toContainText("$200.00 in total");

  await page.getByRole("button", { name: "Sign and grant key" }).click();
  const sign = page.getByRole("dialog", { name: "Sign message" });
  await expect(sign.getByLabel("Message")).toContainText("Allow the agent to act for you");
  await sign.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(page.getByRole("region", { name: "Session keys" })).toContainText("Next run");

  // Two steps reach 15:00 and the run; a third settles its purchase on the frozen clock.
  const step = page
    .getByRole("region", { name: "Presenter controls" })
    .getByRole("button", { name: "Advance the clock 5 seconds" });
  await step.click();
  await step.click();
  await expect(page.getByRole("status").filter({ hasText: "by your agent" })).toBeVisible();
  await step.click();
  const feed = page.getByRole("list", { name: "Agent activity" });
  await expect(feed).toContainText("by your agent");

  await page.getByRole("button", { name: "Stop the agent" }).click();
  await expect(page.getByRole("region", { name: "Session keys" })).toContainText("Revoked");
  await expect(page.getByRole("button", { name: "Stop the agent" })).toBeHidden();
});

test("a prompt outside the grammar is refused with the closest form", async ({ page }) => {
  await page.goto("/agent?at=2026-09-29T16:00:00Z");
  await page.getByLabel("Tell the agent what to do").fill("send all my ETH to my friend");
  await page.getByRole("button", { name: "Compile rule" }).click();
  await expect(page.getByRole("alert")).toContainText("outside what I can do");
  await expect(page.getByRole("alert")).toContainText("For example");
});
