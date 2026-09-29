import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { assetById } from "../data/assets";
import { parseAmount, toDecimalString, type Amount } from "../domain/money/amount";
import { activeAccountStore, setActiveAccount } from "../features/accounts/active-account";
import { ActivityPage } from "../features/activity/ActivityPage";
import { setBalancesHidden } from "../features/privacy/privacy";
import { optimisticHoldings } from "../features/transactions/balances";
import { runTransaction } from "../features/transactions/run-transaction";
import { txEvents } from "../features/transactions/tx-events";
import { txStore } from "../features/transactions/tx-store";
import { memoByOwner } from "../lib/cached-source";
import { balancesHiddenStore } from "../features/privacy/privacy";
import type { TxRequest } from "../ports/chain";
import { testProviders } from "../test/providers";
import { ProvidersContext } from "./providers-context";
import { createSession } from "./session";

const q = (id: string, text: string): Amount =>
  parseAmount(text, assetById(id).decimals) ?? { base: 0n, decimals: 0 };
const send: TxRequest = {
  kind: "send",
  summary: { verb: "Send", primary: { assetId: "rh:USDG", quantity: q("rh:USDG", "-20") } },
  deltas: [{ assetId: "rh:USDG", quantity: q("rh:USDG", "-20") }],
  fee: { assetId: "rh:ETH", quantity: q("rh:ETH", "-0.000004") },
  to: "0x44b1d09c7e3fa2b6581c0d4e9f7a3b2c16d59e0d",
};
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
const usdg = (providers: ReturnType<typeof testProviders>, account = "main") =>
  toDecimalString(
    optimisticHoldings(providers.chain.balances(account), account).find(
      (h) => h.assetId === "rh:USDG",
    )?.quantity ?? {
      base: 0n,
      decimals: 6,
    },
  );

describe("demo session", () => {
  it("Reset demo restores genesis balances and clears in-flight state but keeps preferences", async () => {
    const session = createSession(testProviders);
    const first = session.providers.get();
    setBalancesHidden(true);
    void runTransaction(first, "main", send);
    await flush();
    expect(txStore.get()).toHaveLength(1);
    expect(usdg(first)).toBe("8100.000000");

    session.resetDemo();
    const fresh = session.providers.get();
    expect(fresh).not.toBe(first);
    expect(txStore.get()).toHaveLength(0);
    expect(usdg(fresh)).toBe("8120.000000");
    expect(balancesHiddenStore.get()).toBe(true);
  });

  it("feedback follows the session: one toast per event after a reset", () => {
    const session = createSession(testProviders);
    session.resetDemo();
    const haptics = session.providers.get().haptics;
    txEvents.publish({ type: "confirmed", request: send });
    expect(haptics.played).toEqual(["success"]);
  });
});

describe("active account", () => {
  it("switches what Activity shows", () => {
    const providers = testProviders();
    render(
      <ProvidersContext.Provider value={providers}>
        <ActivityPage />
      </ProvidersContext.Provider>,
    );
    expect(activeAccountStore.get()).toBe("main");
    act(() => {
      setActiveAccount("degen");
    });
    expect(screen.getByText(/No transactions yet/)).toBeInTheDocument();
  });

  it("rejects unknown accounts", () => {
    expect(() => {
      setActiveAccount("nobody");
    }).toThrow(/Unknown account/);
  });
});

describe("memoByOwner", () => {
  it("builds once per owner and key", () => {
    let builds = 0;
    const get = memoByOwner((_owner: object, key: string) => {
      builds += 1;
      return { key };
    });
    const owner = {};
    expect(get(owner, "a")).toBe(get(owner, "a"));
    get(owner, "b");
    get({}, "a");
    expect(builds).toBe(3);
  });
});
