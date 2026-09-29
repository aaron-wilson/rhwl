import { expect, test } from "@playwright/test";

test.describe("line chart", () => {
  test("scrubs by keyboard and announces each point", async ({ page }) => {
    await page.goto("/styleguide?at=2026-09-29T19:00:00Z&freeze=1");
    const chart = page.getByRole("slider", { name: "NVDA price, last 24 hours" });
    const readout = page.getByTestId("chart-readout");
    const latest = await readout.textContent();
    await chart.focus();
    await page.keyboard.press("Home");
    await expect(chart).toHaveAttribute("aria-valuenow", "0");
    await expect(readout).not.toHaveText(latest ?? "");
    await expect(chart).toHaveAttribute("aria-valuetext", /Sep 28.*\$\d/);
    await page.keyboard.press("Escape");
    await expect(readout).toHaveText(latest ?? "");
  });

  test("pointer scrubbing stays within a frame per move", async ({ page }) => {
    await page.goto("/styleguide?at=2026-09-29T19:00:00Z&freeze=1");
    const chart = page.getByRole("slider", { name: "NVDA price, last 24 hours" });
    const box = await chart.boundingBox();
    if (box === null) throw new Error("chart not laid out");
    await page.mouse.move(box.x + 5, box.y + box.height / 2);
    // Time the app's own work per move: from the event to the readout's DOM
    // update. Frame timing is left out on purpose; on a shared, software-
    // rendered CI machine it measures the machine, not the chart.
    const { median, updated } = await page.evaluate(
      async ({ x, y, width }) => {
        const svg = document.querySelector('[aria-label="NVDA price, last 24 hours"] svg');
        const readout = document.querySelector('[data-testid="chart-readout"]');
        if (svg === null || readout === null) throw new Error("chart not found");
        const nextUpdate = () =>
          new Promise<boolean>((resolve) => {
            const observer = new MutationObserver(() => {
              observer.disconnect();
              resolve(true);
            });
            observer.observe(readout, { childList: true, characterData: true, subtree: true });
            setTimeout(() => {
              observer.disconnect();
              resolve(false);
            }, 500);
          });
        const times: number[] = [];
        for (let i = 1; i <= 60; i += 1) {
          const update = nextUpdate();
          const start = performance.now();
          svg.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              clientX: x + (width * i) / 61,
              clientY: y,
            }),
          );
          if (await update) times.push(performance.now() - start);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        times.sort((a, b) => a - b);
        return { median: times[Math.floor(times.length / 2)] ?? Infinity, updated: times.length };
      },
      { x: box.x, y: box.y + box.height / 2, width: box.width },
    );
    expect(updated).toBeGreaterThanOrEqual(55);
    // One 60 Hz frame. Locally this is about 2 ms, and 10 ms at 4x CPU throttling.
    expect(median).toBeLessThan(16);
  });

  test("reduced motion draws the line instantly", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/styleguide?freeze=1");
    const duration = await page
      .locator('[aria-label="NVDA price, last 24 hours"] path')
      .evaluate((el) => getComputedStyle(el).animationDuration);
    expect(Number.parseFloat(duration)).toBeLessThan(0.001);
  });
});
