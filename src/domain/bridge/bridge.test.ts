import { describe, expect, it } from "vitest";
import { assetById } from "../../data/assets";
import { amount, parseAmount, toDecimalString, type Amount } from "../money/amount";
import {
  bridgeLegs,
  bridgeTransition,
  IllegalBridgeTransition,
  initialBridge,
  type BridgeEvent,
  type BridgeMachine,
  type BridgeState,
} from "./machine";
import { bridgeRoutes, formatDuration } from "./routes";

const usd = (text: string): Amount => parseAmount(text, 8) ?? amount(0n, 8);
const side = (chain: "robinhood" | "ethereum" | "solana" | "base", id: string, price: string) => ({
  chain,
  asset: assetById(id),
  price: usd(price),
});
const qty = (id: string, text: string) =>
  parseAmount(text, assetById(id).decimals) ?? amount(0n, 0);
const ethPrice = usd("3000");

describe("bridgeRoutes", () => {
  it("offers only the fast relay between Solana and Robinhood Chain", () => {
    const routes = bridgeRoutes(
      side("solana", "sol:SOL", "200"),
      side("robinhood", "rh:USDG", "1"),
      qty("sol:SOL", "5"),
      { refuel: false, ethPrice },
    );
    expect(routes.map((r) => r.id)).toEqual(["fast"]);
    // $1,000 less 0.12% and $0.40: $998.40.
    expect(routes[0]?.feeCents).toBe(160n);
    expect(toDecimalString(routes[0]?.out ?? amount(0n, 0))).toBe("998.400000");
    expect(routes[0]?.seconds).toBe(20);
  });

  it("adds the free, slow canonical bridge with Ethereum", () => {
    const into = bridgeRoutes(
      side("ethereum", "eth:ETH", "3000"),
      side("robinhood", "rh:ETH", "3000"),
      qty("eth:ETH", "1"),
      { refuel: false, ethPrice },
    );
    expect(into.map((r) => [r.id, r.feeCents, formatDuration(r.seconds)])).toEqual([
      ["fast", 400n, "20 sec"],
      ["canonical", 0n, "12 min"],
    ]);
    const out = bridgeRoutes(
      side("robinhood", "rh:ETH", "3000"),
      side("ethereum", "eth:ETH", "3000"),
      qty("rh:ETH", "1"),
      { refuel: false, ethPrice },
    );
    expect(out.map((r) => formatDuration(r.seconds))).toEqual(["20 sec", "7 days"]);
  });

  it("spends $3 on destination gas when refuel is on", () => {
    const [route] = bridgeRoutes(
      side("solana", "sol:SOL", "200"),
      side("robinhood", "rh:USDG", "1"),
      qty("sol:SOL", "5"),
      { refuel: true, ethPrice },
    );
    expect(toDecimalString(route?.out ?? amount(0n, 0))).toBe("995.400000");
    expect(toDecimalString(route?.refuel ?? amount(0n, 0))).toBe("0.001000000000000000");
  });

  it("delivers nothing when fees exceed the transfer", () => {
    const [route] = bridgeRoutes(
      side("solana", "sol:SOL", "200"),
      side("robinhood", "rh:USDG", "1"),
      qty("sol:SOL", "0.001"),
      { refuel: true, ethPrice },
    );
    expect(route?.out.base).toBe(0n);
  });
});

describe("bridge machine", () => {
  const states: readonly BridgeState[] = ["source_pending", "relaying", "arrived", "failed"];
  const events: readonly BridgeEvent[] = [
    { type: "source_confirmed" },
    { type: "delivered" },
    { type: "failed", error: "Relay timed out" },
  ];
  const next: Partial<Record<BridgeState, Partial<Record<BridgeEvent["type"], BridgeState>>>> = {
    source_pending: { source_confirmed: "relaying", failed: "failed" },
    relaying: { delivered: "arrived", failed: "failed" },
  };

  it.each(states.flatMap((state) => events.map((event) => [state, event] as const)))(
    "%s + %o",
    (state, event) => {
      const machine: BridgeMachine = { ...initialBridge, state };
      const to = next[state]?.[event.type];
      if (to === undefined) {
        expect(() => bridgeTransition(machine, event)).toThrow(IllegalBridgeTransition);
      } else {
        expect(bridgeTransition(machine, event).state).toBe(to);
      }
    },
  );

  it("walks both legs on the timeline", () => {
    let machine = initialBridge;
    expect(bridgeLegs(machine)).toEqual(["current", "waiting"]);
    machine = bridgeTransition(machine, { type: "source_confirmed" });
    expect(bridgeLegs(machine)).toEqual(["done", "current"]);
    machine = bridgeTransition(machine, { type: "delivered" });
    expect(bridgeLegs(machine)).toEqual(["done", "done"]);
  });

  it("marks the leg that failed", () => {
    const early = bridgeTransition(initialBridge, { type: "failed", error: "Rejected" });
    expect(early).toEqual({ state: "failed", error: "Rejected", failedLeg: "source" });
    expect(bridgeLegs(early)).toEqual(["failed", "waiting"]);
    const late = bridgeTransition(bridgeTransition(initialBridge, { type: "source_confirmed" }), {
      type: "failed",
      error: "Relay timed out",
    });
    expect(bridgeLegs(late)).toEqual(["done", "failed"]);
  });
});
