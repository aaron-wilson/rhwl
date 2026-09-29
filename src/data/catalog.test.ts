import { describe, expect, it } from "vitest";
import { parseAmount } from "../domain/money/amount";
import { splash } from "../tokens/color";
import { assetById, assets } from "./assets";
import { chains } from "./chains";
import type { StockToken } from "./types";

const stocks = assets.filter((asset): asset is StockToken => asset.kind === "stock");
const memes = assets.flatMap((asset) => (asset.kind === "meme" ? [asset] : []));

describe("data catalog", () => {
  it("has unique ids and unique symbols per chain", () => {
    expect(new Set(assets.map((a) => a.id)).size).toBe(assets.length);
    expect(new Set(assets.map((a) => `${a.chain}:${a.symbol}`)).size).toBe(assets.length);
  });

  it.each(assets.map((a) => [a.id, a] as const))("%s is well formed", (_id, asset) => {
    expect(chains.map((c) => c.id)).toContain(asset.chain);
    expect(Object.keys(splash)).toContain(asset.splash);
    expect(parseAmount(asset.anchorUsd, 8)?.base ?? 0n).toBeGreaterThan(0n);
    expect(asset.decimals).toBeGreaterThanOrEqual(0);
  });

  it.each(stocks.map((s) => [s.symbol, s] as const))(
    "%s has an earnings date and a multiplier history starting at 1",
    (_symbol, stock) => {
      expect(stock.nextEarnings).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(stock.actions[0]).toMatchObject({ kind: "launch", multiplier: "1" });
      const multipliers = stock.actions.map((a) => parseAmount(a.multiplier, 12)?.base ?? 0n);
      const dates = stock.actions.map((a) => a.date);
      expect([...dates].sort()).toEqual(dates);
      multipliers.slice(1).forEach((m, i) => {
        expect(m).toBeGreaterThan(multipliers[i] ?? 0n);
      });
    },
  );

  it.each(memes.map((m) => [m.symbol, m] as const))(
    "%s quotes against known assets",
    (_symbol, meme) => {
      expect(meme.quotes.length).toBeGreaterThan(0);
      meme.quotes.forEach((id) => {
        expect(["stock", "crypto"]).toContain(assetById(id).kind);
      });
      expect(meme.curve.progressBps).toBeLessThanOrEqual(10000);
      expect(meme.curve.graduated).toBe(meme.curve.progressBps === 10000);
    },
  );

  it("includes stock-paired and basket-quoted memes", () => {
    expect(memes.some((m) => m.quotes.length > 1)).toBe(true);
    expect(
      memes.some((m) => m.quotes.length === 1 && assetById(m.quotes[0] ?? "").kind === "stock"),
    ).toBe(true);
  });

  it("puts Robinhood Chain first with chain id 4663", () => {
    expect(chains[0]).toMatchObject({ id: "robinhood", evmId: 4663, gasSymbol: "ETH" });
  });

  it("throws on unknown ids", () => {
    expect(() => assetById("rh:NOPE")).toThrow(/Unknown asset/);
  });
});

describe("launches", () => {
  it.each(memes.map((m) => [m.symbol, m] as const))("%s has a launch time", (_symbol, meme) => {
    expect(Number.isNaN(Date.parse(meme.launchedAt))).toBe(false);
  });
});
