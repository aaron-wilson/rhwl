import { describe, expect, it } from "vitest";
import { assets } from "../../data/assets";
import { ANCHOR_AT } from "../../data/world";
import { changeBps } from "../../domain/market/change";
import { parseAmount, toDecimalString } from "../../domain/money/amount";
import { createDemoMarket } from "./market";

const day = (iso: string) => new Date(iso);
const logReturnSpread = (prices: readonly bigint[]) => {
  const returns = prices.slice(1).map((p, i) => Math.log(Number(p) / Number(prices[i] ?? p)));
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  return Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
};

describe("demo market", () => {
  const market = createDemoMarket("rhwl");

  it("renders the same series for the same seed and time (snapshot)", () => {
    const series = createDemoMarket("rhwl")
      .series("rh:NVDA", day("2026-09-29T13:30:00Z"), day("2026-09-29T20:00:00Z"), 5)
      .map((p) => toDecimalString(p.price));
    expect(series).toEqual(
      market
        .series("rh:NVDA", day("2026-09-29T13:30:00Z"), day("2026-09-29T20:00:00Z"), 5)
        .map((p) => toDecimalString(p.price)),
    );
    expect(series).toMatchSnapshot();
  });

  it("gives another seed another world", () => {
    const at = day("2026-10-01T15:00:00Z");
    expect(createDemoMarket("other").price("rh:NVDA", at)).not.toEqual(market.price("rh:NVDA", at));
  });

  it.each(assets.map((a) => [a.id, a.anchorUsd] as const))(
    "%s is exactly its anchor price at the anchor instant",
    (id, usd) => {
      expect(market.price(id, ANCHOR_AT)).toEqual(parseAmount(usd, 8));
    },
  );

  it("keeps stablecoins within 0.2% of a dollar for a month", () => {
    const points = market.series(
      "rh:USDG",
      day("2026-09-01T00:00:00Z"),
      day("2026-10-01T00:00:00Z"),
      200,
    );
    points.forEach((p) => {
      expect(p.price.base).toBeGreaterThan(99_800_000n);
      expect(p.price.base).toBeLessThan(100_200_000n);
    });
  });

  it("moves stock tokens less on a weekend than during a trading day", () => {
    const at = (from: string, to: string) =>
      market.series("rh:NVDA", day(from), day(to), 120).map((p) => p.price.base);
    const weekday = logReturnSpread(at("2026-09-29T13:30:00Z", "2026-09-29T20:00:00Z"));
    const weekend = logReturnSpread(at("2026-10-03T13:30:00Z", "2026-10-03T20:00:00Z"));
    expect(weekend).toBeLessThan(weekday);
  });

  it("moves memes far more than stocks over a week", () => {
    const week = (id: string) => {
      const s = market
        .series(id, day("2026-09-21T00:00:00Z"), day("2026-10-12T00:00:00Z"), 60)
        .map((p) => p.price.base);
      return logReturnSpread(s);
    };
    expect(week("rh:CHIPDOG")).toBeGreaterThan(week("rh:NVDA") * 3);
  });

  it("measures stock tokens from the last close and crypto from 24 hours ago", () => {
    const saturday = day("2026-10-03T16:00:00Z");
    expect(market.reference("rh:NVDA", saturday).at.toISOString()).toBe("2026-10-02T20:00:00.000Z");
    expect(market.reference("rh:ETH", saturday).at.toISOString()).toBe("2026-10-02T16:00:00.000Z");
    const bps = changeBps(
      market.price("rh:NVDA", saturday),
      market.reference("rh:NVDA", saturday).price,
    );
    expect(bps).toBeGreaterThan(-2000n);
    expect(bps).toBeLessThan(2000n);
  });
});

describe("assets on other networks", () => {
  it("price exactly as the asset they mirror", () => {
    const market = createDemoMarket("rhwl");
    const at = new Date("2026-09-29T16:00:00Z");
    for (const id of ["eth:ETH", "arb:ETH", "base:ETH"]) {
      expect(market.price(id, at)).toEqual(market.price("rh:ETH", at));
    }
  });
});
