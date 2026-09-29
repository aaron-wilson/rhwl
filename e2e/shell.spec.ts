import { expect, test, type Page } from "@playwright/test";

const tabs = [
  { label: "Trade", heading: "Trade" },
  { label: "Launch", heading: "Launch" },
  { label: "Activity", heading: "Activity" },
  { label: "Settings", heading: "Settings" },
  { label: "Home", heading: "Portfolio" },
] as const;

/** Starts summing layout shifts not caused by user input, kept on the root element. */
async function watchLayoutShift(page: Page) {
  await page.evaluate(() => {
    const root = document.documentElement;
    root.dataset["cls"] = "0";
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!("value" in entry) || !("hadRecentInput" in entry) || entry.hadRecentInput === true)
          continue;
        root.dataset["cls"] = String(Number(root.dataset["cls"]) + Number(entry.value));
      }
    }).observe({ type: "layout-shift", buffered: false });
  });
}

const cls = (page: Page) => page.evaluate(() => Number(document.documentElement.dataset["cls"]));

for (const viewport of [
  { name: "phone 360", width: 360, height: 740 },
  { name: "desktop 1440", width: 1440, height: 900 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("every tab is reachable with no layout shift and no sideways scroll", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
      await watchLayoutShift(page);
      const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
      await expect(nav).toHaveCount(1);
      for (const tab of tabs) {
        await nav.getByRole("link", { name: tab.label }).click();
        await expect(page.getByRole("heading", { level: 1, name: tab.heading })).toBeVisible();
        await expect(nav.getByRole("link", { name: tab.label })).toHaveAttribute(
          "aria-current",
          "page",
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBe(0);
      }
      expect(await cls(page)).toBe(0);
    });
  });
}

test("hiding balances on Home carries to other screens and Settings", async ({ page }) => {
  await page.goto("/");
  const total = await page.getByTestId("portfolio-total").textContent();
  await page.getByRole("button", { name: /Hide balances/ }).click();
  await expect(page.getByText(total ?? "")).toHaveCount(0);
  await expect(page.getByText("Hidden amount").first()).toBeAttached();
  const nav = page.getByRole("navigation", { name: "Primary" }).filter({ visible: true });
  await nav.getByRole("link", { name: "Activity" }).click();
  await expect(page.getByText("+500.00 USDG")).toHaveCount(0);
  await nav.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("switch", { name: /Hide balances/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("deep links load and unknown paths land on a friendly page", async ({ page }) => {
  await page.goto("/launch");
  await expect(page.getByRole("heading", { level: 1, name: "Launch" })).toBeVisible();
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Home" }).click();
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
});

test("hovering a tab prefetches its code before the click", async ({ page }) => {
  // Save-Data turns off the idle warm-up, so only the hover can load the chunk.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true } });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
  const request = page.waitForRequest(/LaunchPage-.*\.js$/);
  await page
    .getByRole("navigation", { name: "Primary" })
    .filter({ visible: true })
    .getByRole("link", { name: "Launch" })
    .hover();
  await request;
});

test("once the page is idle, every tab's code is warmed", async ({ page }) => {
  const loaded = ["Trade", "Launch", "Activity", "Settings"].map((name) =>
    page.waitForRequest(new RegExp(`${name}Page-.*\\.js$`)),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
  await Promise.all(loaded);
});
