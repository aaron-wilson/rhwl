import { describe, expect, it } from "vitest";
import { createSession } from "../../app/session";
import { changedStores } from "../../lib/store";
import { amount } from "../../domain/money/amount";
import { testProviders } from "../../test/providers";
import { addAlert } from "../alerts/alerts-store";
import { approvalsStore } from "../approvals/approvals-store";
import { connectDapp } from "../dapps/connections-store";
import { notify } from "../inbox";
import { runTransaction } from "../transactions/actions";
import { customNetworksStore } from "./networks-store";

describe("Reset demo", () => {
  it("restores the seed state exactly: every session store and the chain", async () => {
    const session = createSession(testProviders);
    const fresh = session.providers.get();
    const before = {
      balances: fresh.chain.balances("main"),
      history: fresh.chain.history("main").length,
    };
    expect(changedStores("session")).toBe(0);

    const p = session.providers.get();
    const usdg = (n: bigint) => amount(n * 1_000_000n, 6);
    const done = runTransaction(p, "main", {
      kind: "send",
      summary: { verb: "Sent", detail: "to stonks.rh" },
      deltas: [{ assetId: "rh:USDG", quantity: usdg(-5n) }],
      fee: { assetId: "rh:ETH", quantity: amount(-1_000_000_000_000n, 18) },
      to: "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3f19",
    });
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
      p.clock.advance(200);
    }
    expect((await done).machine.state).toBe("confirmed");
    connectDapp({
      dappId: "lendwell",
      account: "main",
      chain: "arbitrum",
      permissions: ["view"],
      connectedAt: p.clock.now(),
    });
    addAlert({ assetId: "rh:NVDA", direction: "above", thresholdCents: 10_000_000n }, 1n);
    notify({ kind: "market", at: p.clock.now(), title: "The market is open" });
    approvalsStore.set((list) => list.slice(1));
    customNetworksStore.set([
      { name: "Test", rpcUrl: "https://rpc.example.org", chainId: 9, symbol: "TST" },
    ]);
    expect(changedStores("session")).toBeGreaterThanOrEqual(6);
    expect(p.chain.balances("main")).not.toEqual(before.balances);

    session.resetDemo();
    expect(changedStores("session")).toBe(0);
    const after = session.providers.get();
    expect(after.chain.balances("main")).toEqual(before.balances);
    expect(after.chain.history("main")).toHaveLength(before.history);
  });
});
