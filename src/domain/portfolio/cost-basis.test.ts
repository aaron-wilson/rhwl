import { describe, expect, it } from "vitest";
import { amount } from "../money/amount";
import {
  averageCost,
  averagePrice,
  basisFromHistory,
  realizedOnSale,
  SHADOW_SCALE,
  unrealized,
} from "./cost-basis";

const units = (n: bigint) => amount(n * 100n, 2);
const event = (quantity: bigint, valueCents: bigint) => ({ quantity: units(quantity), valueCents });

describe("averageCost", () => {
  it("starts empty", () => {
    expect(averageCost([], 2)).toEqual({ quantity: amount(0n, 2), costCents: 0n, shadow: 0n });
  });

  it("adds the value of each arrival", () => {
    const basis = averageCost([event(2n, 20_000n), event(2n, 30_000n)], 2);
    expect(basis).toEqual({ quantity: units(4n), costCents: 50_000n, shadow: 0n });
  });

  it("keeps the average cost per unit through a partial sale", () => {
    const basis = averageCost([event(4n, 50_000n), event(-1n, 99_999n)], 2);
    expect(basis).toEqual({ quantity: units(3n), costCents: 37_500n, shadow: 0n });
  });

  it("resets to zero after selling everything, then starts again", () => {
    const basis = averageCost([event(4n, 50_000n), event(-4n, 0n), event(1n, 7_000n)], 2);
    expect(basis).toEqual({ quantity: units(1n), costCents: 7_000n, shadow: 0n });
  });

  it("never removes more than is held", () => {
    const basis = averageCost([event(1n, 1_000n), event(-3n, 0n)], 2);
    expect(basis).toEqual({ quantity: units(0n), costCents: 0n, shadow: 0n });
  });

  it("rounds a proportional removal half-even", () => {
    // 3 units cost 100 cents; selling 1 removes 33.33 → 33 cents.
    const basis = averageCost([event(3n, 100n), event(-1n, 0n)], 2);
    expect(basis.costCents).toBe(67n);
  });
});

describe("unrealized", () => {
  it("measures value against cost", () => {
    expect(unrealized({ quantity: units(1n), costCents: 10_000n, shadow: 0n }, 12_500n)).toEqual({
      cents: 2_500n,
      bps: 2_500n,
    });
  });

  it("reports no percentage without a cost", () => {
    expect(unrealized({ quantity: units(0n), costCents: 0n, shadow: 0n }, 0n)).toEqual({
      cents: 0n,
      bps: 0n,
    });
  });
});

describe("basisFromHistory", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 8, day));
  // $100 a unit until the 10th, then $200.
  const priceAt = (when: Date) => amount(when < at(10) ? 10_000_000_000n : 20_000_000_000n, 8);

  it("values an unexplained balance at the opening price", () => {
    expect(basisFromHistory(units(3n), [], at(1), priceAt)).toEqual({
      quantity: units(3n),
      costCents: 30_000n,
      shadow: 0n,
    });
  });

  it("values each change when it happened, oldest first", () => {
    const history = [
      { at: at(20), quantity: units(-1n) },
      { at: at(12), quantity: units(2n) },
    ];
    // Opening 2 units at $100, +2 at $200 (cost $600 for 4), −1 at average $150.
    expect(basisFromHistory(units(3n), history, at(1), priceAt)).toEqual({
      quantity: units(3n),
      costCents: 45_000n,
      shadow: 0n,
    });
  });

  it("gives an empty basis when nothing is held", () => {
    const history = [{ at: at(12), quantity: units(-2n) }];
    expect(basisFromHistory(units(0n), history, at(1), priceAt).costCents).toBe(0n);
  });
});

describe("shadow position", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 8, day));
  // The asset: $100 a unit until the 10th, then $200. The reference: $50, then $100.
  const priceAt = (when: Date) => amount(when < at(10) ? 10_000_000_000n : 20_000_000_000n, 8);
  const referenceAt = (when: Date) => amount(when < at(10) ? 5_000_000_000n : 10_000_000_000n, 8);
  const refUnits = (dollarsPerUnit: bigint, cents: bigint) =>
    (cents * SHADOW_SCALE) / (dollarsPerUnit * 100_000_000n);

  it("buys the reference with each arrival's dollars at its price then", () => {
    // $300 at the opening buys 6 reference units at $50; $400 on the 12th buys 4 at $100.
    const history = [{ at: at(12), quantity: units(2n) }];
    const basis = basisFromHistory(units(5n), history, at(1), priceAt, referenceAt);
    expect(basis.shadow).toBe(refUnits(50n, 30_000n) + refUnits(100n, 40_000n));
  });

  it("follows the cost through a partial sale", () => {
    const history = [{ at: at(12), quantity: units(-1n) }];
    const basis = basisFromHistory(units(3n), history, at(1), priceAt, referenceAt);
    // Opening 4 units bought 8 reference units; selling a quarter leaves 6.
    expect(basis.shadow).toBe(refUnits(50n, 30_000n));
  });

  it("is zero without a reference", () => {
    expect(basisFromHistory(units(3n), [], at(1), priceAt).shadow).toBe(0n);
  });
});

describe("averagePrice", () => {
  it("is cost per whole unit in dollars", () => {
    expect(averagePrice({ quantity: units(3n), costCents: 45_000n, shadow: 0n })).toEqual(
      amount(15_000_000_000n, 8),
    );
  });

  it("is undefined without a position", () => {
    expect(averagePrice({ quantity: units(0n), costCents: 0n, shadow: 0n })).toBeUndefined();
  });
});

describe("realizedOnSale", () => {
  const basis = { quantity: units(4n), costCents: 40_000n, shadow: 0n };

  it.each([
    ["a gain", 1n, 15_000n, 5_000n],
    ["a loss", 2n, 12_000n, -8_000n],
    ["break-even", 4n, 40_000n, 0n],
    ["more than held, at the cost of what is held", 5n, 50_000n, 10_000n],
  ])("%s", (_name, sold, proceeds, realized) => {
    expect(realizedOnSale(basis, units(sold), proceeds)).toBe(realized);
  });
});
