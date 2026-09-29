import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { auditedRoutes, extraAuditUrls } from "./routes";

// Every route, each checked in both color schemes and both market tints.
const urls = [...auditedRoutes.map((entry) => entry.url), ...extraAuditUrls];
const schemes = ["light", "dark"] as const;
const tints = ["gain", "loss"] as const;

/** Waits for fades and color transitions, so contrast is measured on the settled page. */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        // Scroll-driven and endless animations never finish; only timed, finite ones settle.
        .filter(
          (animation) =>
            animation.timeline instanceof DocumentTimeline &&
            animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

for (const url of urls) {
  test(`${url} has no axe violations in either theme or tint`, async ({ page }) => {
    const sep = url.includes("?") ? "&" : "?";
    await page.goto(`${url}${sep}at=2026-11-18T21:30:00Z`);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    const found: string[] = [];
    for (const colorScheme of schemes) {
      await page.emulateMedia({ colorScheme });
      for (const tint of tints) {
        // The pages that set the tint have already done so; this overrides it for the check.
        await page.evaluate((next) => {
          document.documentElement.dataset["tint"] = next;
        }, tint);
        await settle(page);
        const results = await new AxeBuilder({ page }).analyze();
        found.push(
          ...results.violations.map(
            (v) =>
              `${colorScheme}/${tint} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
          ),
        );
      }
    }
    expect(found).toEqual([]);
  });
}
