import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { parseAmount, type Amount } from "../../domain/money/amount";
import type { TxRequest } from "../../ports/chain";
import { testProviders } from "../../test/providers";
import { Toaster } from "../../ui/Toaster";
import { ActivityPage } from "../activity/ActivityPage";
import { setBalancesHidden } from "../privacy/privacy";
import { PendingIsland } from "./PendingIsland";
import { runTransaction } from "./run-transaction";
import { registerTxFeedback } from "./tx-feedback";
import { txTitleText } from "./tx-title";

const q = (id: string, text: string): Amount =>
  parseAmount(text, assetById(id).decimals) ?? { base: 0n, decimals: 0 };
const send: TxRequest = {
  kind: "send",
  summary: {
    verb: "Send",
    primary: { assetId: "rh:USDG", quantity: q("rh:USDG", "-20") },
    detail: "to Degen",
  },
  deltas: [{ assetId: "rh:USDG", quantity: q("rh:USDG", "-20") }],
  fee: { assetId: "rh:ETH", quantity: q("rh:ETH", "-0.000004") },
  to: "0x44b1d09c7e3fa2b6581c0d4e9f7a3b2c16d59e0d",
};
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe("transaction titles", () => {
  it.each([
    [{ hidden: false }, "Send 20 USDG to Degen"],
    [{ hidden: true }, "Send USDG to Degen"],
    [{ hidden: false, withAmount: false }, "Send USDG to Degen"],
  ])("%j → %s", (options, text) => {
    expect(txTitleText(send.summary, options)).toBe(text);
  });

  it("names a transaction without an amount", () => {
    expect(txTitleText({ verb: "Mint" }, { hidden: false })).toBe("Mint");
  });
});

describe("hidden balances", () => {
  it("never show the amount in the island, toasts, Activity or announcements", async () => {
    setBalancesHidden(true);
    const providers = testProviders();
    const stopFeedback = registerTxFeedback(providers.haptics);
    const { container } = render(
      <ProvidersContext.Provider value={providers}>
        <PendingIsland />
        <Toaster clock={providers.clock} />
        <ActivityPage />
      </ProvidersContext.Provider>,
    );
    const done = runTransaction(providers, "main", send);
    await act(flush);
    const inFlight = container.textContent;
    await act(async () => {
      providers.clock.advance(350);
      await flush();
      providers.clock.advance(1400);
      await done;
    });
    const settled = container.textContent;
    const names = [...container.querySelectorAll("button, [role=status]")].map(
      (el) => el.getAttribute("aria-label") ?? "",
    );
    expect(inFlight).toContain("Send USDG to Degen");
    expect(settled).toContain("Send USDG to Degen confirmed");
    for (const text of [inFlight, settled, ...names]) {
      expect(text).not.toMatch(/\b20\b/);
    }
    stopFeedback();
  });
});
