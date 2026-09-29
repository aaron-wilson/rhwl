import { describe, expect, it } from "vitest";
import { amount } from "./money/amount";
import type { Position } from "./perps/position";
import {
  basketAtShock,
  perpAtShock,
  shockPrice,
  SHOCK_MAX_BPS,
  SHOCK_MIN_BPS,
  valueAtShock,
} from "./whatif";

const usd = (d: bigint) => amount(d * 10n ** 8n, 8);
const long10: Position = {
  side: "long",
  collateralCents: 10_000n,
  leverage: 10,
  entryPrice: usd(100n),
  openedAt: new Date(0),
};

describe("what-if", () => {
  it.each([
    [0, 100n],
    [1_000, 110n],
    [-3_000, 70n],
  ])("shocks a $100 price by %i bps to $%i", (bps, dollars) => {
    expect(shockPrice(usd(100n), bps)).toEqual(usd(dollars));
  });

  it("moves a holding's value with the shock", () => {
    expect(valueAtShock(50_000n, 2_000)).toBe(60_000n);
    expect(valueAtShock(50_000n, -3_000)).toBe(35_000n);
  });

  it("gives a 10x long's P&L and its buffer to liquidation", () => {
    // Liquidation for 10x long at $100 with 0.5% maintenance: $90.50.
    expect(perpAtShock(long10, usd(100n), 500)).toEqual({
      mark: usd(105n),
      pnlCents: 5_000n,
      liquidated: false,
      bufferBps: 1_381n,
    });
  });

  it("liquidates past the liquidation price, losing the margin", () => {
    expect(perpAtShock(long10, usd(100n), -1_000)).toMatchObject({
      liquidated: true,
      pnlCents: -10_000n,
      bufferBps: 0n,
    });
    expect(perpAtShock({ ...long10, side: "short" }, usd(100n), 1_000).liquidated).toBe(true);
  });

  it("recomputes a basket's drift when only its stock members move", () => {
    const weights = [
      { assetId: "rh:NVDA", bps: 5_000 },
      { assetId: "rh:ETH", bps: 5_000 },
    ];
    const out = basketAtShock([5_000n, 5_000n], weights, [true, false], -2_000);
    expect(out.valuesCents).toEqual([4_000n, 5_000n]);
    expect(out.sharesBps).toEqual([4_444, 5_556]);
    expect(out.driftBps).toBe(556);
  });

  it("computes every slider stop for a perp and a basket well inside a frame", () => {
    const weights = Array.from({ length: 8 }, (_, i) => ({ assetId: `a${i}`, bps: 1_250 }));
    const values = weights.map(() => 12_345n);
    const shocked = weights.map((_, i) => i % 2 === 0);
    const started = performance.now();
    for (let bps = SHOCK_MIN_BPS; bps <= SHOCK_MAX_BPS; bps += 100) {
      perpAtShock(long10, usd(100n), bps);
      basketAtShock(values, weights, shocked, bps);
    }
    expect(performance.now() - started).toBeLessThan(16);
  });
});
