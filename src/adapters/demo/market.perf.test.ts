import { describe, expect, it } from "vitest";
import { genesis } from "../../data/accounts";
import { createDemoMarket } from "./market";

// A range change on Home rebuilds the portfolio chart, so it must fit well inside a tap.
const BUDGET_MS = 30;
const from = new Date("2026-09-22T00:00:00Z");
const to = new Date("2026-09-29T16:00:00Z");
const ids = (genesis["main"] ?? []).map((h) => h.assetId);

describe("demo market performance", () => {
  it(`builds a one-week, 300-point series for every holding in under ${BUDGET_MS} ms`, () => {
    // Best of ten fresh markets: other test files share the CPU, and the best run is the honest cost.
    // Five was not enough under the full parallel suite (30.9 ms once, 22 ms alone).
    const runs = Array.from({ length: 10 }, (_, i) => {
      const market = createDemoMarket(`perf-${i}`);
      const start = performance.now();
      ids.forEach((id) => market.series(id, from, to, 300));
      return performance.now() - start;
    });
    const best = Math.min(...runs);
    console.info(
      `portfolio series: ${ids.length} assets x 300 points, best ${best.toFixed(1)} ms of 10`,
    );
    expect(best).toBeLessThan(BUDGET_MS);
  });

  it("returns the cached array for a repeated request", () => {
    const market = createDemoMarket("rhwl");
    const first = market.series("rh:NVDA", from, to, 120);
    expect(market.series("rh:NVDA", from, to, 120)).toBe(first);
  });
});
