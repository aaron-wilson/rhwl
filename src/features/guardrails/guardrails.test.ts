import { describe, expect, it } from "vitest";
import { assetById } from "../../data/assets";
import { amount, parseAmount, type Amount } from "../../domain/money/amount";
import type { ChainTx, TxRequest } from "../../ports/chain";
import { testProviders } from "../../test/providers";
import { runTransaction } from "../transactions/run-transaction";
import { txEvents, type TxEvent } from "../transactions/tx-events";
import { addsRisk, guardrailFacts } from "./facts";
import { guardrailsStore } from "./guardrails-store";
import { registerGuardrails } from "./register";

const q = (id: string, text: string): Amount =>
  parseAmount(text, assetById(id).decimals) ?? amount(0n, 0);
const fee = { assetId: "rh:ETH", quantity: q("rh:ETH", "-0.000004") };
const buy = (assetId: string, tokens: string, usdg: string): TxRequest => ({
  kind: "trade",
  summary: { verb: "Bought" },
  deltas: [
    { assetId: "rh:USDG", quantity: q("rh:USDG", `-${usdg}`) },
    { assetId, quantity: q(assetId, tokens) },
  ],
  fee,
});
const closed = (realizedCents: bigint, at: Date): ChainTx => ({
  hash: `0x${at.getTime()}`,
  nonce: 0,
  request: { kind: "contract", summary: { verb: "Closed" }, deltas: [], fee, realizedCents },
  status: "confirmed",
  submittedAt: at,
  settledAt: at,
  error: undefined,
});
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe("guardrailFacts", () => {
  it("counts losing closes in a row, newest first, until a win", () => {
    const p = testProviders();
    const now = p.clock.now();
    const ago = (m: number) => new Date(now.getTime() - m * 60_000);
    const history = [
      closed(-100n, ago(5)),
      closed(-50n, ago(10)),
      closed(20n, ago(20)),
      closed(-9n, ago(30)),
    ];
    const facts = guardrailFacts(buy("rh:NVDA", "1", "100"), history, p.market, now);
    expect(facts.lossStreak).toBe(2);
    expect(facts.lastLossAt).toEqual(ago(5));
  });

  it("values meme buys and what leaves the account", () => {
    const p = testProviders();
    const facts = guardrailFacts(buy("rh:CHIPDOG", "1000000", "100"), [], p.market, p.clock.now());
    expect(facts.memeBuyCents).toBeGreaterThan(0n);
    expect(facts.valueCents).toBe(10_000n);
    expect(facts.addsRisk).toBe(true);
  });

  it("treats selling for a stablecoin as reducing risk", () => {
    const sell: TxRequest = {
      kind: "trade",
      summary: { verb: "Sold" },
      deltas: [
        { assetId: "rh:NVDA", quantity: q("rh:NVDA", "-1") },
        { assetId: "rh:USDG", quantity: q("rh:USDG", "180") },
      ],
      fee,
    };
    expect(addsRisk(sell)).toBe(false);
    expect(addsRisk({ ...sell, leverage: 3 })).toBe(true);
  });
});

describe("guardrails as the spending policy", () => {
  it("blocks a meme buy over the weekly budget, says why, and never asks to sign", async () => {
    const p = testProviders();
    registerGuardrails(() => p);
    guardrailsStore.set({ memeBudgetCents: 5_000n });
    const events: TxEvent[] = [];
    const stop = txEvents.subscribe((e) => events.push(e));
    let asked = false;
    const tx = await runTransaction(p, "main", buy("rh:CHIPDOG", "1000000", "100"), () => {
      asked = true;
      return Promise.resolve(true);
    });
    stop();
    expect(asked).toBe(false);
    expect(tx.machine.blocked).toBe(true);
    expect(events[0]).toMatchObject({ type: "held", until: undefined });
    expect(tx.simulation?.failure).toMatch(/over your \$50\.00 weekly meme budget/);
  });

  it("lets a stock buy through the same meme budget", async () => {
    const p = testProviders();
    registerGuardrails(() => p);
    guardrailsStore.set({ memeBudgetCents: 5_000n });
    const done = runTransaction(p, "main", buy("rh:NVDA", "0.1", "20"));
    await flush();
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    expect((await done).machine.state).toBe("confirmed");
  });

  it("holds a big trade until the sleep-on-it delay passes, then asks to sign", async () => {
    const p = testProviders();
    registerGuardrails(() => p);
    guardrailsStore.set({ sleepOnIt: { thresholdCents: 5_000n, delayMs: 600_000 } });
    let asked = false;
    void runTransaction(p, "main", buy("rh:NVDA", "0.5", "90"), () => {
      asked = true;
      return Promise.resolve(false);
    });
    await flush();
    p.clock.advance(599_999);
    await flush();
    expect(asked).toBe(false);
    p.clock.advance(1);
    await flush();
    expect(asked).toBe(true);
  });
});
