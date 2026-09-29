import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// The headline journeys end to end, with the open sheets checked by axe in both
// themes, and the app walked once with reduced motion on.
const AT = "at=2026-09-29T16:00:00Z";

async function expectAccessibleSheet(page: Page, sheet: Locator) {
  await expect(sheet).toBeVisible();
  const found: string[] = [];
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          // Spinners run forever; wait only for finite, timed animations.
          .filter(
            (animation) =>
              animation.timeline instanceof DocumentTimeline &&
              animation.effect?.getTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
    );
    const results = await new AxeBuilder({ page }).include("dialog[open]").analyze();
    found.push(
      ...results.violations.map(
        (v) => `${colorScheme} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
      ),
    );
  }
  expect(found).toEqual([]);
}

test("every tab, the palette, an asset and back, with history", async ({ page }) => {
  await page.goto(`/?${AT}`);
  await expect(page.getByTestId("portfolio-total")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const [label, path] of [
    ["Trade", "/trade"],
    ["Launch", "/launch"],
    ["Activity", "/activity"],
    ["Settings", "/settings"],
    ["Home", "/"],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Go anywhere" });
  await palette.getByRole("combobox", { name: "Search commands" }).fill("NVDA");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/asset\/rh-NVDA/);
  await page.goBack();
  await expect(page.getByTestId("portfolio-total")).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/asset\/rh-NVDA/);
});

test("send: the sign sheet passes axe, then the send confirms", async ({ page }) => {
  await page.goto(`/send?to=stonks.rh&asset=rh%3AUSDG&amount=5&${AT}`);
  await page.getByRole("button", { name: "Review and send" }).click();
  const sheet = page.getByRole("dialog", { name: "Confirm with passkey" });
  await expectAccessibleSheet(page, sheet);
  await sheet.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(sheet).toBeHidden();
  const first = page.getByRole("list", { name: "Transactions" }).getByRole("listitem").first();
  await expect(first).toContainText("Confirmed");
});

test("connect a site: the connect sheet passes axe", async ({ page }) => {
  await page.goto(`/browse/lendwell?${AT}`);
  await page.getByRole("button", { name: "Connect wallet" }).click();
  const sheet = page.getByRole("dialog", { name: "Connect to Lendwell" });
  await expectAccessibleSheet(page, sheet);
  await sheet.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByTestId("site-session")).toContainText("Arbitrum One");
});

test("with reduced motion, pages and sheets arrive without animating", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const moving = () =>
    page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => {
          const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
          // A spinner is a progress indicator, which reduced motion keeps.
          const endless = animation.effect?.getTiming().iterations === Infinity;
          return animation.playState === "running" && duration > 10 && !endless;
        })
        .map((animation) => {
          const target =
            animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
          return `${animation.constructor.name} on ${target instanceof Element ? target.outerHTML.slice(0, 120) : "?"}`;
        }),
    );
  await page.goto(`/?${AT}`);
  await expect(page.getByTestId("portfolio-total")).toBeVisible();
  expect(await moving()).toEqual([]);
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Trade" })
    .click();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  expect(await moving()).toEqual([]);
  await page.goto(`/send?to=stonks.rh&asset=rh%3AUSDG&amount=5&${AT}`);
  await page.getByRole("button", { name: "Review and send" }).click();
  await expect(page.getByRole("dialog", { name: "Confirm with passkey" })).toBeVisible();
  expect(await moving()).toEqual([]);
});
