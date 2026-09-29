import { expect, test, type Locator, type Page } from "@playwright/test";

/** Presses Tab until the target has focus, the way a keyboard user would reach it. */
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 120; i += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Element never received keyboard focus");
}

test.describe("primitives by keyboard only", () => {
  test("switch, slider and sheet work without a pointer, with visible focus", async ({ page }) => {
    await page.goto("/styleguide");
    const light = page.locator('[data-theme="light"]');

    const guard = light.getByRole("switch", { name: /Degen guardrails/ });
    await tabTo(page, guard);
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      return el === null ? "none" : getComputedStyle(el).outlineStyle;
    });
    expect(ring).not.toBe("none");
    await page.keyboard.press("Space");
    await expect(guard).toHaveAttribute("aria-checked", "false");

    await tabTo(page, light.getByRole("slider", { name: "Leverage" }));
    await page.keyboard.press("End");
    await expect(light.getByRole("slider", { name: "Leverage" })).toHaveAttribute(
      "aria-valuenow",
      "20",
    );

    await tabTo(page, light.getByRole("button", { name: "Open sheet" }));
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Review swap" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("reduced motion", () => {
  test("transitions are instant and the sheet arrives without animating", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/styleguide");
    const light = page.locator('[data-theme="light"]');
    const duration = await light
      .getByRole("button", { name: "Buy NVDA" })
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(Number.parseFloat(duration)).toBeLessThan(0.001);

    await light.getByRole("button", { name: "Open sheet" }).click();
    const panel = page.getByRole("dialog", { name: "Review swap" }).locator("> div");
    await expect(async () => {
      const transform = await panel.evaluate((el) => getComputedStyle(el).transform);
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    }).toPass();
  });
});
