import { describe, expect, it } from "vitest";
import { maxDriftBps } from "../../domain/basket/basket";
import type { Holding } from "../../ports/chain";
import { testProviders } from "../../test/providers";
import { runTransaction } from "../transactions/run-transaction";
import { basketBuyRequest, memberValues, rebalanceRequest, USDG } from "./basket-request";
import { starterBasket } from "./basket-store";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
const base = (holdings: readonly Holding[], id: string) =>
  holdings.find((h) => h.assetId === id)?.quantity.base ?? 0n;
const members = starterBasket.weights.map((w) => w.assetId);

async function settle(p: ReturnType<typeof testProviders>, done: Promise<unknown>) {
  await flush();
  p.clock.advance(350);
  await flush();
  p.clock.advance(1400);
  return done;
}

describe("basketBuyRequest", () => {
  it("has one leg per member and spends no more than asked", () => {
    const p = testProviders();
    const request = basketBuyRequest(
      "Tendies Index",
      starterBasket.weights,
      100_000n,
      p.market,
      p.clock.now(),
    );
    expect(request?.legs?.map((leg) => leg.summary.primary?.assetId)).toEqual(members);
    const spent = -(request?.deltas.find((d) => d.assetId === USDG)?.quantity.base ?? 0n);
    expect(spent).toBeGreaterThan(99_990n * 10_000n);
    expect(spent).toBeLessThanOrEqual(100_000n * 10_000n);
    expect(request?.summary).toMatchObject({ verb: "Bought", detail: "into Tendies Index" });
  });

  it("executes every leg with one signature", async () => {
    const p = testProviders();
    const before = p.chain.balances("main");
    const request = basketBuyRequest(
      "Tendies Index",
      starterBasket.weights,
      100_000n,
      p.market,
      p.clock.now(),
    );
    if (request === undefined) throw new Error("no request");
    let signatures = 0;
    const tx = await settle(
      p,
      runTransaction(p, "main", request, () => {
        signatures += 1;
        return Promise.resolve(true);
      }),
    );
    expect(tx).toMatchObject({ machine: { state: "confirmed" } });
    expect(signatures).toBe(1);
    const after = p.chain.balances("main");
    members.forEach((id) => {
      expect(base(after, id)).toBeGreaterThan(base(before, id));
    });
  });

  it("reverts every leg when the batch fails", async () => {
    const p = testProviders();
    const before = p.chain.balances("main");
    p.chain.failNext("Simulated network error");
    const request = basketBuyRequest(
      "Tendies Index",
      starterBasket.weights,
      100_000n,
      p.market,
      p.clock.now(),
    );
    if (request === undefined) throw new Error("no request");
    const tx = await settle(p, runTransaction(p, "main", request));
    expect(tx).toMatchObject({ machine: { state: "failed" } });
    expect(p.chain.balances("main")).toEqual(before);
  });
});

describe("rebalanceRequest", () => {
  it("sells what is over target and buys what is under, for about no cash", () => {
    const p = testProviders();
    const now = p.clock.now();
    const holdings = p.chain.balances("main");
    const values = memberValues(starterBasket.weights, holdings, p.market, now);
    expect(maxDriftBps(values, starterBasket.weights)).toBeGreaterThan(0);
    const request = rebalanceRequest(
      "Tendies Index",
      starterBasket.weights,
      holdings,
      p.market,
      now,
    );
    const verbs = request?.legs?.map((leg) => leg.summary.verb) ?? [];
    expect(verbs).toContain("Sell");
    expect(verbs).toContain("Buy");
    const cash = request?.deltas.find((d) => d.assetId === USDG)?.quantity.base ?? 0n;
    // Legs round down to whole token units, so a few cents of USDG may be left over.
    expect(cash < 0n ? -cash : cash).toBeLessThan(10n * 10_000n);
  });
});
