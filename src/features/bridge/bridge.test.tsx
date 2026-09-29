import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { bridgeRoutes } from "../../domain/bridge/routes";
import { parseAmount, toDecimalString, type Amount } from "../../domain/money/amount";
import { testProviders } from "../../test/providers";
import { BridgePage } from "./BridgePage";
import { bridgeStore, startBridge } from "./bridge-store";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
const held = (p: ReturnType<typeof testProviders>, id: string) => {
  const h = p.chain.balances("main").find((x) => x.assetId === id);
  return h === undefined ? "0" : toDecimalString(h.quantity);
};
const qty = (id: string, text: string): Amount => {
  const value = parseAmount(text, assetById(id).decimals);
  if (value === undefined) throw new Error(text);
  return value;
};

describe("startBridge", () => {
  it("sends on Solana, then delivers USDG and refuel ETH on Robinhood Chain", async () => {
    const p = testProviders();
    const now = p.clock.now();
    const [route] = bridgeRoutes(
      { chain: "solana", asset: assetById("sol:SOL"), price: p.market.price("sol:SOL", now) },
      { chain: "robinhood", asset: assetById("rh:USDG"), price: p.market.price("rh:USDG", now) },
      qty("sol:SOL", "1"),
      { refuel: true, ethPrice: p.market.price("rh:ETH", now) },
    );
    if (route === undefined) throw new Error("no route");
    const done = startBridge(p, {
      account: "main",
      fromChain: "solana",
      toChain: "robinhood",
      fromAsset: "sol:SOL",
      toAsset: "rh:USDG",
      amountIn: qty("sol:SOL", "1"),
      route,
    });
    await flush();
    expect(bridgeStore.get()[0]?.machine.state).toBe("source_pending");
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    expect(await done).toBe(true);
    expect(bridgeStore.get()[0]?.machine.state).toBe("relaying");
    // 18.42 SOL less 1 and the 0.000005 SOL fee.
    expect(held(p, "sol:SOL")).toBe("17.419995000");
    expect(held(p, "rh:USDG")).toBe("8120.000000");

    p.clock.advance(route.seconds * 1_000);
    await flush();
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    await flush();
    expect(bridgeStore.get()[0]?.machine.state).toBe("arrived");
    expect(held(p, "rh:USDG")).toBe(
      toDecimalString({ base: 8_120_000_000n + route.out.base, decimals: 6 }),
    );
    expect(held(p, "rh:ETH")).not.toBe("1.204400000000000000");
  });

  it("records a failed source leg", async () => {
    const p = testProviders();
    p.chain.failNext("Simulated network error");
    const now = p.clock.now();
    const [route] = bridgeRoutes(
      { chain: "solana", asset: assetById("sol:SOL"), price: p.market.price("sol:SOL", now) },
      { chain: "robinhood", asset: assetById("rh:ETH"), price: p.market.price("rh:ETH", now) },
      qty("sol:SOL", "1"),
      { refuel: false, ethPrice: p.market.price("rh:ETH", now) },
    );
    if (route === undefined) throw new Error("no route");
    const done = startBridge(p, {
      account: "main",
      fromChain: "solana",
      toChain: "robinhood",
      fromAsset: "sol:SOL",
      toAsset: "rh:ETH",
      amountIn: qty("sol:SOL", "1"),
      route,
    });
    await flush();
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    expect(await done).toBe(false);
    expect(bridgeStore.get()[0]?.machine).toMatchObject({ state: "failed", failedLeg: "source" });
  });
});

describe("BridgePage", () => {
  function renderBridge() {
    const providers = testProviders();
    const router = createMemoryRouter([{ path: "/bridge", Component: BridgePage }], {
      initialEntries: ["/bridge"],
    });
    render(
      <ProvidersContext.Provider value={providers}>
        <RouterProvider router={router} />
      </ProvidersContext.Provider>,
    );
    return providers;
  }

  it("quotes Solana into Robinhood Chain and follows both legs", async () => {
    const p = renderBridge();
    await userEvent.type(screen.getByRole("textbox", { name: /Send SOL on Solana/ }), "1");
    const routes = screen.getByRole("radiogroup", { name: "Routes" });
    expect(within(routes).getAllByRole("radio")).toHaveLength(1);
    expect(routes).toHaveTextContent("Hopline relay");
    expect(screen.getByRole("switch", { name: /Refuel/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("button", { name: "Bridge to Robinhood Chain" }));
    await act(async () => {
      await flush();
      p.clock.advance(350);
      await flush();
      p.clock.advance(1400);
      await flush();
    });
    const transfer = screen.getByTestId("bridge-transfer");
    expect(transfer).toHaveTextContent("Sent on Solana");
    expect(transfer).toHaveTextContent("arrives in");
    await act(async () => {
      p.clock.advance(20_000);
      await flush();
      p.clock.advance(350);
      await flush();
      p.clock.advance(1400);
      await flush();
    });
    expect(screen.getByTestId("bridge-transfer")).toHaveTextContent(/Arrived: [\d,.]+ USDG/);
  });

  it("offers the canonical bridge only with Ethereum, and says when there is nothing to send", async () => {
    renderBridge();
    await userEvent.click(screen.getByRole("button", { name: "Ethereum" }));
    expect(screen.getByText("Nothing to send on Ethereum in this account.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Bridge out" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: /Send ETH on Robinhood Chain/ }),
      "0.1",
    );
    const routes = within(screen.getByRole("radiogroup", { name: "Routes" })).getAllByRole("radio");
    expect(routes.map((r) => r.textContent)).toEqual([
      expect.stringContaining("About 20 sec"),
      expect.stringContaining("About 7 days"),
    ]);
  });
});
