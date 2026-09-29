import { describe, expect, it } from "vitest";
import type { FlexCard } from "../../domain/flex/card";
import { amount } from "../../domain/money/amount";
import { cardLines } from "./card-image";

const card: FlexCard = {
  account: "main",
  accountName: "you.rh",
  assetId: "rh:NVDA",
  symbol: "NVDA",
  pnlBps: -1250n,
  pnlCents: -4_200n,
  entry: amount(20_000_000_000n, 8),
  mark: amount(17_500_000_000n, 8),
  at: new Date("2026-09-29T16:00:00.000Z"),
};

describe("cardLines", () => {
  it("draws the numbers exactly as signed", () => {
    expect(cardLines(card)).toEqual({
      title: "NVDA · you.rh",
      pnl: "−12.50%",
      details: ["P&L −$42.00", "Entry $200.00 → Mark $175.00"],
      footer: "Signed by the wallet · 2026-09-29 · verify at the link",
    });
  });

  it("leaves dollars off a card signed with balances hidden", () => {
    expect(cardLines({ ...card, pnlCents: undefined }).details[0]).toBe("P&L not shown");
  });
});
