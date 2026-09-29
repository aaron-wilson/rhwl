import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { createDemoChain } from "../../adapters/demo/chain";
import { createDemoSimulation } from "../../adapters/demo/simulation";
import { ProvidersContext } from "../../app/providers-context";
import { genesis } from "../../data/accounts";
import { pastTransactions } from "../../data/history";
import { DEFAULT_SEED } from "../../data/world";
import { toDecimalString } from "../../domain/money/amount";
import { testProviders } from "../../test/providers";
import { addAccount } from "../accounts/accounts-store";
import { setActiveAccount } from "../accounts/active-account";
import { SendPage } from "./SendPage";

const STONKS = "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3f19";
const LOOKALIKE = "0x7a2c5b0e8d1f4a9c6e2b7d03f5a8c1e9b4d23f19";

function renderSend(path = "/send") {
  const base = testProviders();
  const chain = createDemoChain({
    clock: base.clock,
    seed: DEFAULT_SEED,
    genesis,
    history: pastTransactions,
  });
  const providers = { ...base, chain, simulation: createDemoSimulation(chain) };
  const router = createMemoryRouter(
    [
      { path: "/send", Component: SendPage },
      { path: "/activity", element: <p>Activity page</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return { providers, router };
}
const recipientField = () => screen.getByRole("textbox", { name: "To" });
const amountField = () => screen.getByRole("textbox", { name: /^Amount in/ });
const submit = () => screen.getByRole("button", { name: "Review and send" });
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe("SendPage", () => {
  it("fills in from a request link", () => {
    renderSend(`/send?to=${STONKS}&chain=robinhood&asset=rh%3AUSDG&amount=25`);
    expect(recipientField()).toHaveValue(STONKS);
    expect(screen.getByTestId("recipient")).toHaveTextContent("stonks.rh · 0x7a2c…3F19");
    expect(screen.getByRole("combobox", { name: "Asset" })).toHaveValue("rh:USDG");
    expect(amountField()).toHaveValue("25");
    expect(submit()).toBeEnabled();
  });

  it("warns when a request is for another network", () => {
    renderSend(`/send?to=${STONKS}&chain=base&asset=rh%3AUSDG&amount=25`);
    expect(screen.getByRole("note")).toHaveTextContent("sends on Robinhood Chain only");
  });

  it("suggests past recipients and your other accounts", async () => {
    renderSend();
    const suggestions = screen.getByRole("list", { name: "Suggestions" });
    expect(suggestions).toHaveTextContent("stonks.rh");
    expect(suggestions).toHaveTextContent("Degen");
    await userEvent.click(within(suggestions).getByRole("button", { name: /Degen/ }));
    expect(recipientField()).toHaveValue("0x44b1d09c7e3fa2b6581c0d4e9f7a3b2c16d59e0d");
  });

  it("resolves names and explains what it can't resolve", async () => {
    renderSend();
    await userEvent.type(recipientField(), "yolo.eth");
    expect(screen.getByTestId("recipient")).toHaveTextContent("yolo.eth · 0x9C4e…62f4");
    await userEvent.clear(recipientField());
    await userEvent.type(recipientField(), "0x7a2c");
    expect(screen.getByText("An address is 0x and 40 characters; this has 4")).toBeInTheDocument();
    expect(recipientField()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/checked against their EIP-55 checksum/)).toBeInTheDocument();
  });

  it("catches a mistyped letter through the checksum", async () => {
    renderSend();
    await userEvent.type(recipientField(), "0x7a2c9e41b0D35F86A2c417e9D0b3a8F6C21E3f19");
    expect(screen.getByText(/don't match this address's checksum/)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("refuses the account's own address", async () => {
    renderSend();
    await userEvent.type(recipientField(), "0x8f3a41c2b7d9e05a6f1c3b2d4e8a9f07c6b5c21e");
    expect(screen.getByText("That's this account's own address")).toBeInTheDocument();
  });

  it("stops a lookalike of a past recipient until every character is checked", async () => {
    renderSend(`/send?asset=rh%3AUSDG&amount=5`);
    await userEvent.type(recipientField(), LOOKALIKE);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("This looks like stonks.rh (0x7a2c…3f19) but it isn't");
    expect(submit()).toBeDisabled();
    await userEvent.click(within(alert).getByRole("checkbox"));
    expect(submit()).toBeEnabled();
  });

  it("says when the balance is short", async () => {
    renderSend(`/send?to=${STONKS}&asset=rh%3AUSDG`);
    await userEvent.type(amountField(), "9000");
    expect(screen.getByTestId("send-problem")).toHaveTextContent("Not enough USDG");
    expect(submit()).toBeDisabled();
  });

  it("keeps the network fee back on Max for ETH", async () => {
    renderSend(`/send?to=${STONKS}&asset=rh%3AETH`);
    await userEvent.click(screen.getByRole("button", { name: "Max" }));
    expect(amountField()).toHaveValue("1.204396");
    expect(submit()).toBeEnabled();
  });

  it("takes an amount in dollars", async () => {
    renderSend(`/send?to=${STONKS}&asset=rh%3AUSDG`);
    await userEvent.click(screen.getByRole("button", { name: "Enter in USD" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Amount in US dollars" }), "100");
    // USDG trades near, not exactly at, $1 in the demo market.
    expect(screen.getByText(/≈ (99\.\d+|100(\.\d+)?) USDG/)).toBeInTheDocument();
  });

  it("sends through the lifecycle, then shows Activity", async () => {
    const { providers, router } = renderSend(`/send?to=stonks.rh&asset=rh%3AUSDG&amount=25`);
    await userEvent.click(submit());
    await act(async () => {
      await flush();
      providers.clock.advance(350);
      await flush();
      providers.clock.advance(1400);
      await flush();
    });
    expect(router.state.location.pathname).toBe("/activity");
    const usdg = providers.chain.balances("main").find((h) => h.assetId === "rh:USDG");
    expect(usdg === undefined ? "" : toDecimalString(usdg.quantity)).toBe("8095.000000");
  });

  it("won't send from a watch-only account", () => {
    addAccount({
      id: "watched",
      name: "Watched",
      kind: "watch",
      address: STONKS,
      solanaAddress: undefined,
      device: undefined,
    });
    setActiveAccount("watched");
    renderSend();
    expect(screen.getByText(/Watched is watch-only/)).toBeInTheDocument();
  });
});
