import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { scenarios } from "../../app/startup";
import { perpMarketById } from "../../data/perps";
import { amount } from "../../domain/money/amount";
import { testProviders } from "../../test/providers";
import { PerpsPage } from "./PerpsPage";
import { closePosition, openPosition, perpsStore, watchPositions } from "./perps-store";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
const green = () => testProviders(new Date(scenarios["green-day"].at), scenarios["green-day"].seed);
const settle = async (p: ReturnType<typeof testProviders>) => {
  await flush();
  p.clock.advance(350);
  await flush();
  p.clock.advance(1400);
  await flush();
};
const usdg = (p: ReturnType<typeof testProviders>) =>
  p.chain.balances("main").find((h) => h.assetId === "rh:USDG")?.quantity.base ?? 0n;
const btc = () => {
  const market = perpMarketById("BTC-PERP");
  if (market === undefined) throw new Error("no market");
  return market;
};

async function openBtc(p: ReturnType<typeof testProviders>, overrides = {}) {
  const done = openPosition(p, {
    account: "main",
    market: btc(),
    side: "long",
    collateralCents: 100_000n,
    leverage: 10,
    takeProfit: undefined,
    stopLoss: undefined,
    ...overrides,
  });
  await settle(p);
  expect(await done).toBe(true);
}

describe("perps store", () => {
  it("posts margin, opens at the mark, and closes a share of it for its equity", async () => {
    const p = green();
    await openBtc(p);
    expect(usdg(p)).toBe(8_120_000_000n - 1_000_000_000n);
    const [position] = perpsStore.get();
    expect(position?.entryPrice).toEqual(p.market.price("rh:WBTC", p.clock.now()));

    const closing = closePosition(p, position?.id ?? 0, 50);
    await settle(p);
    expect(await closing).toBe(true);
    expect(perpsStore.get()[0]?.collateralCents).toBe(50_000n);
    // Half of about $1,000 equity comes back.
    expect(usdg(p)).toBeGreaterThan(7_120_000_000n + 499_000_000n);
  });

  it("fires a take-profit without asking for a signature", async () => {
    const p = green();
    const now = p.clock.now();
    const mark = p.market.price("rh:WBTC", now);
    await openBtc(p, { takeProfit: amount(mark.base + 1n, 8) });
    p.clock.advance(5 * 60_000);
    watchPositions(p, p.clock.now());
    await settle(p);
    expect(perpsStore.get()).toHaveLength(0);
    expect(usdg(p)).toBeGreaterThan(8_120_000_000n);
  });

  it("liquidates a position whose mark has passed the liquidation price", async () => {
    const p = green();
    await openBtc(p, { side: "short", leverage: 20 });
    const [position] = perpsStore.get();
    if (position === undefined) throw new Error("no position");
    // Pretend the market ripped 10% against the short.
    perpsStore.set([
      { ...position, entryPrice: amount((position.entryPrice.base * 90n) / 100n, 8) },
    ]);
    watchPositions(p, p.clock.now());
    expect(perpsStore.get()).toHaveLength(0);
  });
});

describe("PerpsPage", () => {
  it("previews the liquidation price and shows a Green-day long in profit after fast-forward", async () => {
    const p = green();
    const router = createMemoryRouter([{ path: "/perps", Component: PerpsPage }], {
      initialEntries: ["/perps?market=BTC-PERP"],
    });
    render(
      <ProvidersContext.Provider value={p}>
        <RouterProvider router={router} />
      </ProvidersContext.Provider>,
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Margin in USDG" }), "1000");
    expect(screen.getByTestId("liq-price")).toHaveTextContent(/^\$\d{2,3},\d{3}\.\d{2}$/);
    await userEvent.type(screen.getByRole("textbox", { name: "Take profit (optional)" }), "1");
    expect(screen.getByText("Take profit must be above the entry")).toBeInTheDocument();
    await userEvent.clear(screen.getByRole("textbox", { name: "Take profit (optional)" }));

    await userEvent.click(screen.getByRole("button", { name: /^Long BTC \d+x$/ }));
    await act(async () => {
      await settle(p);
    });
    const card = screen.getByRole("region", { name: /long BTC/ });
    act(() => {
      p.clock.advance(5 * 60_000);
    });
    expect(within(card).getByTestId("position-pnl")).toHaveTextContent(/^\+\$/);
  });
});
