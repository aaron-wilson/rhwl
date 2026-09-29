import { describe, expect, it } from "vitest";
import { amount, parseAmount, toDecimalString, type Amount } from "../money/amount";
import {
  checkTriggers,
  equityCents,
  fundingCents,
  isLiquidated,
  liquidationPrice,
  notionalCents,
  pnlCents,
  triggerHit,
  type Position,
} from "./position";

const usd = (text: string): Amount => parseAmount(text, 8) ?? amount(0n, 8);
const at = new Date("2026-09-29T19:30:00Z");
const long: Position = {
  side: "long",
  collateralCents: 100_000n,
  leverage: 10,
  entryPrice: usd("3000"),
  openedAt: at,
};
const short: Position = { ...long, side: "short" };
const price = (value: Amount) => toDecimalString(value).replace(/0+$/, "").replace(/\.$/, "");

describe("perp positions", () => {
  it("sizes the position at collateral times leverage", () => {
    expect(notionalCents(long)).toBe(1_000_000n);
  });

  it.each([
    ["3300", 100_000n, -100_000n],
    ["2700", -100_000n, 100_000n],
    ["3000", 0n, 0n],
  ])("at $%s, long P&L %d¢ and short %d¢", (mark, longPnl, shortPnl) => {
    expect(pnlCents(long, usd(mark))).toBe(longPnl);
    expect(pnlCents(short, usd(mark))).toBe(shortPnl);
  });

  it.each([
    [1, "long", "15"],
    [10, "long", "2715"],
    [20, "long", "2865"],
    [10, "short", "3285"],
    [20, "short", "3135"],
  ] as const)("liquidation at %dx %s is $%s", (leverage, side, expected) => {
    expect(price(liquidationPrice({ side, leverage, entryPrice: usd("3000") }))).toBe(expected);
  });

  it("liquidates once the mark reaches the price, where equity equals maintenance", () => {
    expect(isLiquidated(long, usd("2716"))).toBe(false);
    expect(isLiquidated(long, usd("2715"))).toBe(true);
    expect(isLiquidated(short, usd("3285"))).toBe(true);
    // At the liquidation price equity is 0.5% of size: $50 on a $10,000 position.
    expect(equityCents(long, usd("2715"), 0n)).toBe(5_000n);
  });

  it("accrues funding continuously: longs pay, shorts receive", () => {
    const later = new Date(at.getTime() + 8 * 3_600_000);
    // 0.01% of $10,000 per 8 hours is $1.
    expect(fundingCents(long, 100, later)).toBe(100n);
    expect(fundingCents(short, 100, later)).toBe(-100n);
    expect(fundingCents(long, 100, new Date(at.getTime() + 4 * 3_600_000))).toBe(50n);
    expect(equityCents(long, usd("3000"), 100n)).toBe(99_900n);
  });
});

describe("take profit and stop loss", () => {
  it.each([
    ["long", "3300", "2900", undefined],
    ["long", "2900", undefined, "Take profit must be above the entry"],
    ["long", undefined, "3100", "Stop loss must be below the entry"],
    ["short", "2700", "3100", undefined],
    ["short", "3100", undefined, "Take profit must be below the entry"],
    ["short", undefined, "2900", "Stop loss must be above the entry"],
  ] as const)("%s TP %s SL %s → %s", (side, tp, sl, expected) => {
    expect(
      checkTriggers(
        side,
        usd("3000"),
        tp === undefined ? undefined : usd(tp),
        sl === undefined ? undefined : usd(sl),
      ),
    ).toBe(expected);
  });

  it("reports which trigger the mark hit", () => {
    expect(triggerHit("long", usd("3301"), usd("3300"), usd("2900"))).toBe("take-profit");
    expect(triggerHit("long", usd("2899"), usd("3300"), usd("2900"))).toBe("stop-loss");
    expect(triggerHit("short", usd("2699"), usd("2700"), usd("3100"))).toBe("take-profit");
    expect(triggerHit("long", usd("3000"), usd("3300"), usd("2900"))).toBeUndefined();
  });
});
