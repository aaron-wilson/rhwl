import { describe, expect, it } from "vitest";
import { createDemoMarket } from "../adapters/demo/market";
import { genesis } from "../data/accounts";
import { assetById } from "../data/assets";
import { gapSince } from "../domain/market/gap";
import { lastClose } from "../domain/market/hours";
import { totalCents } from "../domain/portfolio/portfolio";
import { scenarios } from "./startup";

// Scenario seeds are chosen, not random: these tests keep each one telling its story.
const dayChange = (seed: string, iso: string) => {
  const market = createDemoMarket(seed);
  const at = new Date(iso);
  const before = new Date(at.getTime() - 24 * 3_600_000);
  const holdings = genesis["main"] ?? [];
  return (
    totalCents(holdings, (id) => market.price(id, at)) -
    totalCents(holdings, (id) => market.price(id, before))
  );
};

describe("scenarios", () => {
  it("green-day opens on a portfolio gain", () => {
    expect(dayChange(scenarios["green-day"].seed, scenarios["green-day"].at)).toBeGreaterThan(0n);
  });

  it("red-day opens on a portfolio loss", () => {
    expect(dayChange(scenarios["red-day"].seed, scenarios["red-day"].at)).toBeLessThan(0n);
  });

  it("weekend-gap opens while NYSE is closed", async () => {
    const { marketState } = await import("../domain/market/hours");
    expect(marketState(new Date(scenarios["weekend-gap"].at)).session).toBe("closed");
  });

  it("weekend-gap has every stock-linked holding up since Friday's close", () => {
    const { seed, at } = scenarios["weekend-gap"];
    const market = createDemoMarket(seed);
    const when = new Date(at);
    const close = lastClose(when);
    const gap = gapSince(
      genesis["main"] ?? [],
      assetById,
      (id) => market.price(id, close),
      (id) => market.price(id, when),
    );
    expect(gap.stocks.length).toBeGreaterThan(0);
    [...gap.stocks, ...gap.pairedMemes].forEach((line) => {
      expect(line.change.bps).toBeGreaterThan(0n);
    });
  });
});
