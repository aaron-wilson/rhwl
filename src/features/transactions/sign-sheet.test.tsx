import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { parseAmount, type Amount } from "../../domain/money/amount";
import type { TxRequest } from "../../ports/chain";
import { testProviders } from "../../test/providers";
import { runTransaction } from "./run-transaction";
import { approveEverything, signerStore } from "./signer";
import { sponsoredLeftStore } from "./fee-options";
import { SignerHost } from "./SignerHost";
import { txStore } from "./tx-store";

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
// jsdom has no AnimationEvent, so React listens for the webkit-prefixed name there.
const endAnimation = (element: HTMLElement) => {
  fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
};

function mount() {
  const providers = testProviders();
  const view = render(
    <ProvidersContext.Provider value={providers}>
      <SignerHost />
    </ProvidersContext.Provider>,
  );
  return { providers, ...view };
}

describe("passkey signing", () => {
  it("is the signer while the host is mounted, and auto-approve again after", () => {
    const { unmount } = mount();
    expect(signerStore.get().sign).not.toBe(approveEverything);
    unmount();
    expect(signerStore.get().sign).toBe(approveEverything);
  });

  it("shows the changes and first-time recipient, and signs after the scan", async () => {
    const { providers } = mount();
    const done = runTransaction(providers, "main", send);
    await act(flush);
    const sheet = await screen.findByRole("dialog", { name: "Confirm with passkey" });
    expect(sheet).toHaveTextContent("Send 20 USDG to Degen");
    expect(screen.getByRole("list", { name: "Balance changes" })).toHaveTextContent("−20 USDG");
    expect(screen.getByRole("list", { name: "Balance changes" })).toHaveTextContent("Network fee");
    expect(screen.getByRole("list", { name: "Findings" })).toHaveTextContent(
      "haven't sent to this address",
    );
    expect(txStore.get()[0]?.machine.state).toBe("awaiting_signature");
    await userEvent.click(screen.getByRole("button", { name: "Confirm with passkey" }));
    endAnimation(screen.getByTestId("sign-scan"));
    await act(flush);
    expect(txStore.get()[0]?.machine.state).toBe("submitted");
    await act(async () => {
      providers.clock.advance(5000);
      await done;
    });
    expect(txStore.get()[0]?.machine.state).toBe("confirmed");
  });

  it("returns the transaction to review when the sheet is closed", async () => {
    const { providers } = mount();
    const done = runTransaction(providers, "main", send);
    await screen.findByRole("dialog", { name: "Confirm with passkey" });
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    const tx = await done;
    expect(tx.machine.state).toBe("simulated");
    expect(providers.chain.nonce("main")).toBe(0);
  });
});

describe("collectibles on the sign sheet", () => {
  it("lists a collectible leaving the wallet beside the fee", async () => {
    const { providers } = mount();
    void runTransaction(providers, "main", {
      kind: "contract",
      summary: { verb: "Burned", detail: "Chainlets #412" },
      deltas: [],
      fee: { assetId: "rh:ETH", quantity: q("rh:ETH", "-0.000004") },
      to: "0x3333000000000000000000000000000000000003",
      collectibles: [{ id: "chainlets-412", name: "Chainlets #412" }],
    });
    const changes = await screen.findByRole("list", { name: "Balance changes" });
    expect(changes).toHaveTextContent("Network fee");
    expect(changes).toHaveTextContent("Chainlets #412");
    expect(changes).toHaveTextContent("Leaves your wallet");
    expect(screen.queryByRole("list", { name: "Findings" })).not.toBeInTheDocument();
  });
});

describe("gas in anything", () => {
  const holding = (p: ReturnType<typeof testProviders>, id: string) =>
    p.chain.balances("main").find((h) => h.assetId === id)?.quantity.base ?? 0n;

  async function signWith(choose: () => Promise<void>) {
    const { providers } = mount();
    const done = runTransaction(providers, "main", send);
    await screen.findByRole("dialog", { name: "Confirm with passkey" });
    await userEvent.click(screen.getByRole("button", { name: "Change fee" }));
    await choose();
    const quoted = screen.getByTestId("sign-fee").textContent;
    await userEvent.click(screen.getByRole("button", { name: "Confirm with passkey" }));
    endAnimation(screen.getByTestId("sign-scan"));
    await act(async () => {
      await flush();
      providers.clock.advance(5000);
      await done;
    });
    return { providers, quoted, tx: await done };
  }

  it("pays the fee in NVDA, lowering NVDA by exactly the quoted amount", async () => {
    const nvdaBefore = testProviders()
      .chain.balances("main")
      .find((h) => h.assetId === "rh:NVDA");
    const { providers, quoted, tx } = await signWith(async () => {
      const payWith = screen.getByRole("radiogroup", { name: "Pay fee with" });
      await userEvent.click(within(payWith).getByRole("radio", { name: /NVDA/ }));
    });
    expect(tx.machine.state).toBe("confirmed");
    expect(tx.request.fee.assetId).toBe("rh:NVDA");
    expect(quoted).toMatch(/^−0\.0000\d+ NVDA$/);
    expect(holding(providers, "rh:NVDA")).toBe(
      (nvdaBefore?.quantity.base ?? 0n) + tx.request.fee.quantity.base,
    );
    // ETH is untouched: the paymaster took NVDA instead.
    expect(holding(providers, "rh:ETH")).toBe(1_204_400_000_000_000_000n);
  });

  it("uses a sponsored transaction, which costs nothing and uses up the promo", async () => {
    const { providers, quoted, tx } = await signWith(async () => {
      await userEvent.click(screen.getByRole("radio", { name: /Covered by Robinhood · 3 left/ }));
    });
    expect(quoted).toBe("Free");
    expect(tx.request.fee.quantity.base).toBe(0n);
    expect(holding(providers, "rh:ETH")).toBe(1_204_400_000_000_000_000n);
    expect(sponsoredLeftStore.get()).toBe(2);
  });

  it("charges more for a fast confirmation", async () => {
    const { quoted, tx } = await signWith(async () => {
      await userEvent.click(screen.getByRole("radio", { name: /fast/i }));
    });
    expect(quoted).toBe("−0.000006 ETH");
    expect(tx.request.fee.quantity.base).toBe(-6_000_000_000_000n);
  });
});
