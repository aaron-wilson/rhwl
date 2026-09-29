import { describe, expect, it } from "vitest";
import { amount, toDecimalString } from "../money/amount";
import {
  buyOnCurve,
  CURVE_SUPPLY,
  curveFor,
  curvePrice,
  isGraduated,
  progressBps,
  sellOnCurve,
  usd8,
} from "./curve";

const dollars = (n: bigint) => amount(n * 100_000_000n, 8);

describe("bonding curve", () => {
  it("starts a seeded launch at its catalog price and progress", () => {
    const curve = curveFor(usd8("0.00064"), 4_700);
    expect(progressBps(curve)).toBe(4_700);
    // Within a millionth of a cent of the anchor after integer rounding.
    expect(Number(curvePrice(curve).base)).toBeGreaterThanOrEqual(63_999);
    expect(Number(curvePrice(curve).base)).toBeLessThanOrEqual(64_000);
  });

  it("raises the price with every buy", () => {
    let curve = curveFor(usd8("0.0001"), 1_000);
    let last = curvePrice(curve).base;
    for (let i = 0; i < 5; i += 1) {
      curve = buyOnCurve(curve, dollars(2_000n)).curve;
      const next = curvePrice(curve).base;
      expect(next).toBeGreaterThan(last);
      last = next;
    }
  });

  it("gives back what a buy paid, less the fee both ways, on an immediate sell", () => {
    const start = curveFor(usd8("0.0001"), 1_000);
    const bought = buyOnCurve(start, dollars(1_000n));
    const sold = sellOnCurve(bought.curve, bought.tokens);
    expect(sold.curve.sold).toBe(start.sold);
    // 1% in and 1% out: about $980.10 back.
    expect(Number(toDecimalString(sold.usd))).toBeCloseTo(980.1, 1);
  });

  it("fills the curve on a buy that crosses graduation, spending only what it takes", () => {
    const start = curveFor(usd8("0.00087"), 8_200);
    const trade = buyOnCurve(start, dollars(1_000_000n));
    expect(trade.graduated).toBe(true);
    expect(isGraduated(trade.curve)).toBe(true);
    expect(trade.curve.sold).toBe(CURVE_SUPPLY);
    expect(trade.tokens.base).toBe(CURVE_SUPPLY - start.sold);
    expect(trade.usd.base + trade.refund.base).toBe(dollars(1_000_000n).base);
    expect(trade.refund.base).toBeGreaterThan(0n);
    expect(progressBps(trade.curve)).toBe(10_000);
  });

  it("does not trade on a graduated curve or sell more than was sold", () => {
    const full = curveFor(usd8("0.001"), 10_000);
    expect(buyOnCurve(full, dollars(10n)).tokens.base).toBe(0n);
    const early = curveFor(usd8("0.0001"), 100);
    expect(sellOnCurve(early, amount(early.sold * 2n, 18)).tokens.base).toBe(early.sold);
  });
});
