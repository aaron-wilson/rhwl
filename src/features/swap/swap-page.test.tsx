import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { toDecimalString } from "../../domain/money/amount";
import { QUOTE_LATENCY_MS, QUOTE_TTL_MS } from "../../domain/swap/quote";
import { testProviders } from "../../test/providers";
import { SwapPage } from "./SwapPage";

function renderSwap(path = "/swap") {
  const providers = testProviders();
  const router = createMemoryRouter(
    [
      { path: "/swap", Component: SwapPage },
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
const pay = () => screen.getByRole("textbox", { name: "You pay" });
const review = () => screen.getByRole("button", { name: /Review swap|Swap anyway/ });
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe("SwapPage", () => {
  it("quotes three routes after the aggregator answers, best first", async () => {
    const { providers } = renderSwap();
    await userEvent.type(pay(), "100");
    expect(screen.getByTestId("quote-status")).toHaveTextContent("Refreshing quote…");
    expect(review()).toBeDisabled();
    act(() => {
      providers.clock.advance(QUOTE_LATENCY_MS);
    });
    const routes = screen.getAllByRole("radio");
    expect(routes).toHaveLength(3);
    expect(routes[0]).toHaveTextContent("Best");
    expect(routes[0]).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("swap-out")).toHaveTextContent(/^0\.0\d+$/);
    expect(screen.getByText("Minimum received")).toBeInTheDocument();
    expect(review()).toBeEnabled();
  });

  it("blocks review once the quote goes stale, then refreshes it", async () => {
    const { providers } = renderSwap();
    await userEvent.type(pay(), "100");
    act(() => {
      providers.clock.advance(QUOTE_LATENCY_MS);
    });
    expect(screen.getByTestId("quote-status")).toHaveTextContent("Quote refreshes in 15s");
    act(() => {
      providers.clock.advance(QUOTE_TTL_MS);
    });
    expect(screen.getByTestId("quote-status")).toHaveTextContent("Refreshing quote…");
    expect(review()).toBeDisabled();
    act(() => {
      providers.clock.advance(QUOTE_LATENCY_MS);
    });
    expect(review()).toBeEnabled();
  });

  it("lets the user pick another route and a custom slippage", async () => {
    const { providers } = renderSwap();
    await userEvent.type(pay(), "100");
    act(() => {
      providers.clock.advance(QUOTE_LATENCY_MS);
    });
    const last = screen.getAllByRole("radio")[2];
    if (last === undefined) throw new Error("no route");
    await userEvent.click(last);
    expect(last).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("button", { name: "Custom" }));
    const custom = screen.getByRole("textbox", { name: "Custom slippage percent" });
    await userEvent.clear(custom);
    await userEvent.type(custom, "60");
    expect(screen.getByText("Enter a tolerance above 0% and at most 50%.")).toBeInTheDocument();
    expect(review()).toBeDisabled();
  });

  it("warns above 5% price impact", async () => {
    const { providers } = renderSwap("/swap?from=rh%3AUSDG&to=rh%3ACHIPDOG");
    await userEvent.type(pay(), "60000");
    act(() => {
      providers.clock.advance(QUOTE_LATENCY_MS);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("moves the price by more than 5%");
    expect(screen.getByTestId("swap-problem")).toHaveTextContent("Not enough USDG");
  });

  it("picks tokens with search and flips direction", async () => {
    renderSwap();
    await userEvent.click(screen.getByRole("button", { name: /Receive ETH/ }));
    const sheet = await screen.findByRole("dialog", { name: "Receive" });
    await userEvent.type(within(sheet).getByRole("searchbox"), "nvid");
    const tokens = within(sheet).getByRole("list", { name: "Tokens" });
    expect(within(tokens).getAllByRole("button")).toHaveLength(1);
    expect(tokens).toHaveTextContent("Verified");
    await userEvent.click(within(tokens).getByRole("button", { name: /NVDA/ }));
    expect(screen.getByRole("button", { name: /Receive NVDA/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Swap direction" }));
    expect(screen.getByRole("button", { name: /Pay with NVDA/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Receive USDG/ })).toBeInTheDocument();
  });

  it("swaps through the transaction lifecycle", async () => {
    const { providers, router } = renderSwap();
    await userEvent.type(pay(), "100");
    act(() => {
      providers.clock.advance(QUOTE_LATENCY_MS);
    });
    await userEvent.click(review());
    await act(async () => {
      await flush();
      providers.clock.advance(350);
      await flush();
      providers.clock.advance(1400);
      await flush();
    });
    expect(router.state.location.pathname).toBe("/activity");
    const held = (id: string) => {
      const h = providers.chain.balances("main").find((x) => x.assetId === id);
      return h === undefined ? "" : toDecimalString(h.quantity);
    };
    expect(held("rh:USDG")).toBe("8020.000000");
    expect(held("rh:ETH")).not.toBe("1.204400000000000000");
  });
});
