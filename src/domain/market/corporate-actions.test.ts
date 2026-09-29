import { describe, expect, it } from "vitest";
import { assetById } from "../../data/assets";
import { stockTokens } from "../../data/stocks";
import type { CorporateAction, StockToken } from "../../data/types";
import { parseAmount, toDecimalString } from "../money/amount";
import { actionSteps, dividendShares, multiplierAt, sharesFor } from "./corporate-actions";

const stock = (id: string): StockToken => {
  const asset = assetById(id);
  if (asset.kind !== "stock") throw new Error(`${id} is not a stock token`);
  return asset;
};
// Decimal text without trailing zeros: "1.000054000000" → "1.000054".
const text = (value: { base: bigint; decimals: number }) =>
  toDecimalString(value)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
const NOW = new Date("2026-09-29T16:00:00Z");

describe("multiplierAt", () => {
  it("is 1 at launch and steps up on the dividend date, New York time", () => {
    const { actions } = stock("rh:NVDA");
    expect(text(multiplierAt(actions, new Date("2026-07-02T00:00:00Z")))).toBe("1");
    // Sep 5 starts at 04:00 UTC in New York (EDT).
    expect(text(multiplierAt(actions, new Date("2026-09-05T03:59:00Z")))).toBe("1");
    expect(text(multiplierAt(actions, new Date("2026-09-05T04:00:00Z")))).toBe("1.000054");
  });

  it("is 1 before anything took effect", () => {
    expect(text(multiplierAt(stock("rh:NVDA").actions, new Date("2026-01-01T00:00:00Z")))).toBe(
      "1",
    );
  });

  it.each(stockTokens.map((s) => [s.symbol, s] as const))(
    "%s ends on its last seeded multiplier",
    (_, token) => {
      expect(text(multiplierAt(token.actions, NOW))).toBe(token.actions.at(-1)?.multiplier);
    },
  );
});

describe("actionSteps", () => {
  it("measures what each step added", () => {
    const steps = actionSteps(stock("rh:AAPL").actions, NOW);
    expect(steps.map((s) => s.action.kind)).toEqual(["launch", "dividend"]);
    expect(steps.map((s) => text(s.added))).toEqual(["0", "0.001034"]);
  });

  it("stops at `at`", () => {
    expect(actionSteps(stock("rh:AAPL").actions, new Date("2026-08-01T00:00:00Z"))).toHaveLength(1);
  });
});

describe("dividendShares", () => {
  it("counts dividend growth", () => {
    expect(text(dividendShares(stock("rh:NVDA").actions, NOW))).toBe("0.000054");
  });

  it("ignores splits", () => {
    expect(text(dividendShares(stock("rh:TSLA").actions, NOW))).toBe("0");
  });

  it("keeps dividend growth that came before a split, scaled by it", () => {
    const actions: readonly CorporateAction[] = [
      { date: "2026-07-01", kind: "launch", multiplier: "1" },
      { date: "2026-07-10", kind: "dividend", multiplier: "1.01" },
      { date: "2026-07-20", kind: "split", multiplier: "2.02" },
      { date: "2026-07-30", kind: "dividend", multiplier: "2.0402" },
    ];
    // Splits alone would give 2; the rest came from dividends.
    expect(text(dividendShares(actions, NOW))).toBe("0.0402");
  });
});

describe("sharesFor", () => {
  it("multiplies a token balance by shares per token", () => {
    const tokens = parseAmount("12.408", 18);
    const perToken = parseAmount("0.000054", 12);
    if (tokens === undefined || perToken === undefined) throw new Error("bad fixture");
    expect(text(sharesFor(tokens, perToken))).toBe("0.00067");
  });
});
