import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { parseAmount, type Amount } from "../../domain/money/amount";
import type { TxRequest } from "../../ports/chain";
import { testProviders } from "../../test/providers";
import { runTransaction } from "../transactions/run-transaction";
import { SignerHost } from "../transactions/SignerHost";
import { txStore } from "../transactions/tx-store";
import { accountsStore } from "./accounts-store";
import { activeAccountStore } from "./active-account";
import { AccountSheet } from "./AccountSheet";

function mount() {
  const providers = testProviders();
  render(
    <ProvidersContext.Provider value={providers}>
      <AccountSheet />
      <SignerHost />
    </ProvidersContext.Provider>,
  );
  return providers;
}

async function pairThrough(providers: ReturnType<typeof testProviders>) {
  await userEvent.click(screen.getByRole("button", { name: "Add hardware wallet" }));
  expect(screen.getByRole("status")).toHaveTextContent("Looking for devices");
  act(() => {
    providers.clock.advance(1500);
  });
  await userEvent.click(screen.getByRole("button", { name: "Ledger Nano X" }));
}

const q = (id: string, text: string): Amount =>
  parseAmount(text, assetById(id).decimals) ?? { base: 0n, decimals: 0 };
const send: TxRequest = {
  kind: "send",
  summary: { verb: "Send", primary: { assetId: "rh:USDG", quantity: q("rh:USDG", "-5") } },
  deltas: [{ assetId: "rh:USDG", quantity: q("rh:USDG", "-5") }],
  fee: { assetId: "rh:ETH", quantity: q("rh:ETH", "-0.000004") },
  to: "0x44b1d09c7e3fa2b6581c0d4e9f7a3b2c16d59e0d",
};

describe("hardware pairing", () => {
  it("finds the device, confirms the address, and switches to the new account", async () => {
    const providers = mount();
    await pairThrough(providers);
    expect(screen.getByTestId("pairing-address")).toHaveTextContent(/^0x[0-9a-f]{40}$/);
    await userEvent.click(screen.getByRole("button", { name: "It matches" }));
    expect(accountsStore.get().map((a) => a.id)).toContain("ledger");
    expect(activeAccountStore.get()).toBe("ledger");
    expect(providers.haptics.played).toContain("success");
  });

  it("warns and does not pair when the address doesn't match", async () => {
    const providers = mount();
    await pairThrough(providers);
    await userEvent.click(screen.getByRole("button", { name: "It doesn't match" }));
    expect(screen.getByRole("alert")).toHaveTextContent("tampered");
    expect(accountsStore.get().map((a) => a.id)).not.toContain("ledger");
  });

  it("asks a hardware account to confirm on the device", async () => {
    const providers = mount();
    await pairThrough(providers);
    await userEvent.click(screen.getByRole("button", { name: "It matches" }));
    void runTransaction(providers, "ledger", send);
    const sheet = await screen.findByRole("dialog", { name: "Confirm on device" });
    expect(sheet).toHaveTextContent("Review and approve on your Ledger Nano X");
    await userEvent.click(screen.getByRole("button", { name: "Approve on device" }));
    fireEvent(screen.getByTestId("sign-scan"), new Event("webkitAnimationEnd", { bubbles: true }));
    await act(async () => {
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });
    expect(txStore.get()[0]?.machine.state).toBe("submitted");
  });
});
