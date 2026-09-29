import { describe, expect, it } from "vitest";
import { assetById } from "../../data/assets";
import { amount, parseAmount, type Amount } from "../money/amount";
import { gapSince } from "./gap";

const usd = (text: string): Amount => parseAmount(text, 8) ?? amount(0n, 8);
const tokens = (text: string): Amount => parseAmount(text, 18) ?? amount(0n, 18);

const close: Record<string, Amount> = {
  "rh:NVDA": usd("100"),
  "rh:AAPL": usd("200"),
  "rh:CHIPDOG": usd("0.001"),
  "rh:TENDIES": usd("0.001"),
  "rh:ETH": usd("3000"),
};
const now: Record<string, Amount> = {
  "rh:NVDA": usd("102"),
  "rh:AAPL": usd("199"),
  "rh:CHIPDOG": usd("0.0011"),
  "rh:TENDIES": usd("0.002"),
  "rh:ETH": usd("3300"),
};
const price = (table: Record<string, Amount>) => (id: string) => table[id] ?? usd("0");

describe("gapSince", () => {
  const gap = gapSince(
    [
      { assetId: "rh:NVDA", quantity: tokens("10") },
      { assetId: "rh:AAPL", quantity: tokens("5") },
      { assetId: "rh:CHIPDOG", quantity: tokens("1000000") },
      { assetId: "rh:TENDIES", quantity: tokens("1000000") },
      { assetId: "rh:ETH", quantity: tokens("1") },
    ],
    assetById,
    price(close),
    price(now),
  );

  it("lists held stock tokens, largest move first", () => {
    expect(gap.stocks.map((l) => [l.asset.symbol, l.change])).toEqual([
      ["NVDA", { cents: 2_000n, bps: 200n }],
      ["AAPL", { cents: -500n, bps: -50n }],
    ]);
  });

  it("includes memes paired with a stock token, not other memes or crypto", () => {
    // CHIPDOG trades against NVDA; TENDIES against ETH.
    expect(gap.pairedMemes.map((l) => [l.asset.symbol, l.change])).toEqual([
      ["CHIPDOG", { cents: 10_000n, bps: 1_000n }],
    ]);
  });

  it("totals the stock-linked value", () => {
    // Close: 1,000 + 1,000 + 1,000 = $3,000. Now: 1,020 + 995 + 1,100 = $3,115.
    expect(gap.total).toEqual({ cents: 11_500n, bps: 383n });
  });

  it("is empty without stock-linked holdings", () => {
    const empty = gapSince(
      [{ assetId: "rh:ETH", quantity: tokens("1") }],
      assetById,
      price(close),
      price(now),
    );
    expect(empty).toEqual({ stocks: [], pairedMemes: [], total: { cents: 0n, bps: 0n } });
  });
});
