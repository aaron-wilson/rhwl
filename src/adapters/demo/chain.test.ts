import { describe, expect, it } from "vitest";
import { genesis, knownAddresses } from "../../data/accounts";
import { assetById } from "../../data/assets";
import { parseAmount, toDecimalString, type Amount } from "../../domain/money/amount";
import type { Chain, TxRequest } from "../../ports/chain";
import { createDemoChain } from "./chain";
import { createDemoClock } from "./clock";
import { createDemoSimulation } from "./simulation";

const qty = (assetId: string, text: string): Amount => {
  const value = parseAmount(text, assetById(assetId).decimals);
  if (value === undefined) throw new Error(text);
  return value;
};
const fee = { assetId: "rh:ETH", quantity: qty("rh:ETH", "-0.000004") };
const send = (text: string, to = "0x1234000000000000000000000000000000005678"): TxRequest => ({
  kind: "send",
  summary: { verb: "Send" },
  deltas: [{ assetId: "rh:USDG", quantity: qty("rh:USDG", `-${text}`) }],
  fee,
  to,
});

function setup() {
  const clock = createDemoClock(new Date("2026-09-29T16:00:00Z"), { frozen: true });
  const chain = createDemoChain({
    clock,
    seed: "rhwl",
    genesis,
    latency: { acceptMs: 300, confirmMs: 1200 },
  });
  return { clock, chain, simulation: createDemoSimulation(chain) };
}

const balance = (chain: Chain, assetId: string) =>
  toDecimalString(
    chain.balances("main").find((h) => h.assetId === assetId)?.quantity ?? qty(assetId, "0"),
  );

// The Chain contract: any adapter must pass this spec. Only the demo chain exists today.
describe("Chain contract: demo", () => {
  it("starts from genesis balances with nonce 0 and no history", () => {
    const { chain } = setup();
    expect(balance(chain, "rh:USDG")).toBe("8120.000000");
    expect(chain.nonce("main")).toBe(0);
    expect(chain.history("main")).toEqual([]);
  });

  it("accepts, then confirms after the network latency, applying deltas and fee", async () => {
    const { clock, chain } = setup();
    const submitted = chain.submit("main", send("20"));
    clock.advance(300);
    const hash = await submitted;
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(chain.history("main")[0]?.status).toBe("pending");
    expect(balance(chain, "rh:USDG")).toBe("8120.000000");
    const settled = chain.settle(hash);
    clock.advance(1200);
    expect((await settled).status).toBe("confirmed");
    expect(balance(chain, "rh:USDG")).toBe("8100.000000");
    expect(balance(chain, "rh:ETH")).toBe("1.204396000000000000");
    expect(chain.nonce("main")).toBe(1);
  });

  it("fails without touching balances when funds run short at confirmation", async () => {
    const { clock, chain } = setup();
    const submitted = chain.submit("main", send("9000"));
    clock.advance(300);
    const settled = chain.settle(await submitted);
    clock.advance(1200);
    const tx = await settled;
    expect(tx).toMatchObject({ status: "failed", error: "Insufficient USDG" });
    expect(balance(chain, "rh:USDG")).toBe("8120.000000");
  });

  it("gives the same hashes for the same seed", async () => {
    const hashes = await Promise.all(
      [setup(), setup()].map(async ({ clock, chain }) => {
        const pending = chain.submit("main", send("1"));
        clock.advance(300);
        return pending;
      }),
    );
    expect(hashes[0]).toBe(hashes[1]);
  });

  it("notifies subscribers on every change", async () => {
    const { clock, chain } = setup();
    let calls = 0;
    chain.subscribe(() => (calls += 1));
    const pending = chain.submit("main", send("1"));
    clock.advance(300);
    await pending;
    clock.advance(1200);
    expect(calls).toBe(2);
  });
});

describe("demo chain controls", () => {
  it("fails the next transaction on request", async () => {
    const { clock, chain } = setup();
    chain.failNext("Simulated network error");
    const pending = chain.submit("main", send("1"));
    clock.advance(300);
    const settled = chain.settle(await pending);
    clock.advance(1200);
    expect(await settled).toMatchObject({ status: "failed", error: "Simulated network error" });
  });
});

describe("demo simulation", () => {
  it("previews every balance change including the fee", () => {
    const { simulation } = setup();
    const result = simulation.simulate("main", send("20"));
    expect(result.failure).toBeUndefined();
    expect(result.deltas.map((d) => [d.assetId, toDecimalString(d.quantity)])).toEqual([
      ["rh:USDG", "-20.000000"],
      ["rh:ETH", "-0.000004000000000000"],
    ]);
  });

  it.each([
    ["insufficient-balance", send("9000"), "danger"],
    ["known-drainer", send("1", [...knownAddresses.drainers][0]), "danger"],
    ["first-time-recipient", send("1"), "info"],
    [
      "unlimited-approval",
      {
        kind: "approve",
        summary: { verb: "Approve", detail: "USDG" },
        deltas: [],
        fee,
        to: "0x1111000000000000000000000000000000000001",
        allowance: "unlimited",
      },
      "warning",
    ],
    [
      "unverified-contract",
      {
        kind: "contract",
        summary: { verb: "Mint" },
        deltas: [],
        fee,
        to: "0x9999000000000000000000000000000000000009",
      },
      "warning",
    ],
  ] as const)("flags %s", (id, request, severity) => {
    const { simulation } = setup();
    expect(simulation.simulate("main", request).findings).toContainEqual(
      expect.objectContaining({ id, severity }),
    );
  });

  it("stops calling a recipient new after a confirmed send", async () => {
    const { clock, chain, simulation } = setup();
    const pending = chain.submit("main", send("1"));
    clock.advance(300);
    await pending;
    clock.advance(1200);
    const ids = simulation.simulate("main", send("1")).findings.map((f) => f.id);
    expect(ids).not.toContain("first-time-recipient");
  });
});
