import { describe, expect, it } from "vitest";
import { assetById } from "../../data/assets";
import { parseAmount, toDecimalString } from "../../domain/money/amount";
import type { Holding, TxRequest } from "../../ports/chain";
import { testProviders } from "../../test/providers";
import { optimisticHoldings } from "./balances";
import { ALLOW } from "../../domain/policy/decision";
import { policyStore } from "./policy";
import { runTransaction } from "./run-transaction";
import { registerTxFeedback } from "./tx-feedback";
import { txStore } from "./tx-store";

const qty = (assetId: string, text: string) =>
  parseAmount(text, assetById(assetId).decimals) ?? parseAmount("0", 0);
const send = (usdg: string): TxRequest => ({
  kind: "send",
  summary: { verb: "Send" },
  deltas: [
    { assetId: "rh:USDG", quantity: qty("rh:USDG", `-${usdg}`) ?? { base: 0n, decimals: 6 } },
  ],
  fee: { assetId: "rh:ETH", quantity: qty("rh:ETH", "-0.000004") ?? { base: 0n, decimals: 18 } },
  to: "0x1234000000000000000000000000000000005678",
});
const usdg = (holdings: readonly Holding[]) =>
  toDecimalString(
    holdings.find((h) => h.assetId === "rh:USDG")?.quantity ?? { base: 0n, decimals: 6 },
  );
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
const state = () => txStore.get()[0]?.machine.state;

describe("runTransaction", () => {
  it("moves optimistically, then confirms on the chain", async () => {
    const p = testProviders();
    const stop = registerTxFeedback(p.haptics);
    const done = runTransaction(p, "main", send("20"));
    await flush();
    expect(state()).toBe("submitted");
    expect(usdg(optimisticHoldings(p.chain.balances("main"), "main"))).toBe("8100.000000");
    expect(usdg(p.chain.balances("main"))).toBe("8120.000000");
    p.clock.advance(350);
    await flush();
    expect(state()).toBe("pending");
    p.clock.advance(1400);
    const tx = await done;
    expect(tx.machine.state).toBe("confirmed");
    expect(tx.machine.hash).toMatch(/^0x/);
    expect(usdg(optimisticHoldings(p.chain.balances("main"), "main"))).toBe("8100.000000");
    expect(p.haptics.played).toEqual(["light", "success"]);
    stop();
  });

  it("rolls the optimistic balance back when the chain fails it", async () => {
    const p = testProviders();
    const stop = registerTxFeedback(p.haptics);
    p.chain.failNext("Simulated network error");
    const done = runTransaction(p, "main", send("20"));
    await flush();
    expect(usdg(optimisticHoldings(p.chain.balances("main"), "main"))).toBe("8100.000000");
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    const tx = await done;
    expect(tx.machine).toMatchObject({ state: "failed", error: "Simulated network error" });
    expect(usdg(optimisticHoldings(p.chain.balances("main"), "main"))).toBe("8120.000000");
    expect(p.haptics.played).toEqual(["light", "error"]);
    stop();
  });

  it("never broadcasts a transaction the simulation blocked", async () => {
    const p = testProviders();
    const tx = await runTransaction(p, "main", send("9000"));
    expect(tx.machine).toMatchObject({ state: "simulated", blocked: true });
    expect(tx.simulation?.failure).toMatch(/Not enough USDG/);
    expect(p.chain.nonce("main")).toBe(0);
  });

  it("returns to review when the signature is refused", async () => {
    const p = testProviders();
    const tx = await runTransaction(p, "main", send("1"), () => Promise.resolve(false));
    expect(tx.machine.state).toBe("simulated");
    expect(p.chain.nonce("main")).toBe(0);
  });
});

describe("runTransaction policy hook", () => {
  it("asks the policy about every transaction, before the signature", async () => {
    const p = testProviders();
    const seen: string[] = [];
    policyStore.set({
      check: (request, context) => {
        seen.push(`${request.kind}:${context.account}`);
        return ALLOW;
      },
    });
    const done = runTransaction(p, "main", send("1"), (request) => {
      seen.push(`sign:${request.kind}`);
      return Promise.resolve(true);
    });
    await flush();
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    expect((await done).machine.state).toBe("confirmed");
    expect(seen).toEqual(["send:main", "sign:send"]);
  });

  it("blocks with the policy's reasons and never asks for a signature", async () => {
    const p = testProviders();
    policyStore.set({
      check: () => ({ kind: "block", reasons: ["Over your weekly meme budget."] }),
    });
    let asked = false;
    const tx = await runTransaction(p, "main", send("1"), () => {
      asked = true;
      return Promise.resolve(true);
    });
    expect(asked).toBe(false);
    expect(tx.machine).toMatchObject({ state: "simulated", blocked: true });
    expect(tx.simulation?.failure).toBe("Over your weekly meme budget.");
  });

  it("holds a delayed transaction until the clock passes the time", async () => {
    const p = testProviders();
    const until = new Date(p.clock.now().getTime() + 60_000);
    policyStore.set({ check: () => ({ kind: "delay", until, reasons: ["Sleep on it."] }) });
    let asked = false;
    void runTransaction(p, "main", send("1"), () => {
      asked = true;
      return Promise.resolve(false);
    });
    await flush();
    p.clock.advance(59_999);
    await flush();
    expect(asked).toBe(false);
    p.clock.advance(1);
    await flush();
    expect(asked).toBe(true);
  });
});
