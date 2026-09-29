import { describe, expect, it } from "vitest";
import {
  earningsCalendar,
  earningsNight,
  exposureChangeAtShock,
  isEarningsNight,
  totalExposure,
  type Exposure,
} from "./earnings";

describe("earnings night", () => {
  it("runs from the 4 PM ET close to the next 9:30 AM open", () => {
    expect(earningsNight("2026-11-18")).toEqual({
      start: new Date("2026-11-18T21:00:00Z"),
      end: new Date("2026-11-19T14:30:00Z"),
    });
    // In daylight time the same wall-clock hours are an hour earlier in UTC.
    expect(earningsNight("2026-10-21").start).toEqual(new Date("2026-10-21T20:00:00Z"));
  });

  it.each([
    ["2026-11-18T20:59:00Z", false],
    ["2026-11-18T21:30:00Z", true],
    ["2026-11-19T14:29:00Z", true],
    ["2026-11-19T14:30:00Z", false],
  ])("at %s: %s", (at, night) => {
    expect(isEarningsNight("2026-11-18", new Date(at))).toBe(night);
  });
});

describe("earningsCalendar", () => {
  const stocks = [
    { id: "rh:NVDA", nextEarnings: "2026-11-18", held: true },
    { id: "rh:AAPL", nextEarnings: "2026-10-29", held: false },
    { id: "rh:MSFT", nextEarnings: "2026-10-27", held: false },
    { id: "rh:TSLA", nextEarnings: "2026-10-21", held: true },
  ];
  const memes = [
    { symbol: "CHIPDOG", quotes: ["rh:NVDA"] },
    { symbol: "BASKET", quotes: ["rh:NVDA", "rh:AAPL", "rh:MSFT"] },
  ];

  it("lists held stocks and stocks paired to held memes, soonest first", () => {
    const entries = earningsCalendar(stocks, memes, new Date("2026-09-29T16:00:00Z"));
    expect(entries).toEqual([
      { assetId: "rh:TSLA", date: "2026-10-21", held: true, pairedMemes: [] },
      { assetId: "rh:MSFT", date: "2026-10-27", held: false, pairedMemes: ["BASKET"] },
      { assetId: "rh:AAPL", date: "2026-10-29", held: false, pairedMemes: ["BASKET"] },
      { assetId: "rh:NVDA", date: "2026-11-18", held: true, pairedMemes: ["CHIPDOG", "BASKET"] },
    ]);
  });

  it("drops a report once its night is over", () => {
    const entries = earningsCalendar(stocks, memes, new Date("2026-10-22T15:00:00Z"));
    expect(entries.map((e) => e.assetId)).not.toContain("rh:TSLA");
  });
});

describe("exposure", () => {
  const e: Exposure = {
    tokenCents: 200_000n,
    memes: [
      { symbol: "CHIPDOG", valueCents: 50_000n },
      { symbol: "BASKET", valueCents: 30_000n },
    ],
    perpCents: -100_000n,
  };

  it("adds token, paired memes and signed perp size", () => {
    expect(totalExposure(e)).toBe(180_000n);
  });

  it("moves holdings with the stock and a short against it", () => {
    // +10%: holdings +$280.00, short −$100.00.
    expect(exposureChangeAtShock(e, 1_000)).toBe(18_000n);
    expect(exposureChangeAtShock(e, -1_000)).toBe(-18_000n);
    expect(exposureChangeAtShock(e, 0)).toBe(0n);
  });
});
