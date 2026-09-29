import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { scenarios } from "../../app/startup";
import { assets } from "../../data/assets";
import { testProviders } from "../../test/providers";
import { AssetPage } from "./AssetPage";
import { assetPath } from "./asset-path";

function renderAt(path: string, start?: Date, seed?: string) {
  const router = createMemoryRouter(
    [
      { path: "/asset/:slug", Component: AssetPage },
      { path: "/", element: <p>Home</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <ProvidersContext.Provider value={testProviders(start, seed)}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
}

describe("AssetPage", () => {
  it("shows price, position, stats, about and activity for a held stock token", () => {
    renderAt("/asset/rh-NVDA");
    expect(screen.getByRole("heading", { level: 1, name: "NVIDIA" })).toBeInTheDocument();
    expect(screen.getByTestId("asset-price")).toHaveTextContent(/^\$\d{2,3}\.\d{2}$/);
    const position = screen.getByRole("region", { name: "Your position" });
    expect(within(position).getByText("12.408 NVDA")).toBeInTheDocument();
    expect(within(position).getByText("Unrealized P&L")).toBeInTheDocument();
    const stats = screen.getByRole("region", { name: "Key stats" });
    expect(within(stats).getByText("NASDAQ")).toBeInTheDocument();
    expect(within(stats).getByText("Nov 18, 2026")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "About" })).toHaveTextContent(
      "track one share of NVDA",
    );
    expect(screen.getByRole("region", { name: "Activity" })).toHaveTextContent(
      "No NVDA transactions yet.",
    );
  });

  it("splits a held paired meme's P&L into its quote's move and its own", () => {
    renderAt("/asset/rh-CHIPDOG");
    const lens = screen.getByRole("region", { name: "Pair Lens" });
    expect(within(lens).getByText("NVDA's move")).toBeInTheDocument();
    expect(within(lens).getByText("CHIPDOG's own move")).toBeInTheDocument();
    expect(within(lens).getByTestId("pair-lens-sentence")).toHaveTextContent(
      /^NVDA moved [+−]\d+\.\d{2}% since you bought, worth [+−]\$[\d,]+\.\d{2}\. CHIPDOG (added|gave back) \$[\d,]+\.\d{2} (on top|of it)\.$/,
    );
  });

  it("names the basket for a multipool meme, and asks to hold one that isn't", () => {
    renderAt("/asset/rh-BASKET");
    expect(screen.getByRole("region", { name: "Pair Lens" })).toHaveTextContent(
      "the NVDA/AAPL/MSFT basket's move",
    );
    cleanup();
    renderAt("/asset/rh-ORCHARD");
    expect(screen.getByRole("region", { name: "Pair Lens" })).toHaveTextContent(
      "Hold ORCHARD to see how much of its move is AAPL and how much is its own.",
    );
  });

  it("shows an empty position for an asset the account doesn't hold", () => {
    renderAt("/asset/rh-MSFT");
    expect(screen.getByRole("region", { name: "Your position" })).toHaveTextContent(
      "You don't hold any MSFT in this account.",
    );
  });

  it("offers every action for a tradable Robinhood Chain asset", () => {
    renderAt("/asset/rh-ETH");
    expect(screen.getByRole("link", { name: "Send" })).toHaveAttribute(
      "href",
      "/send?asset=rh%3AETH",
    );
    expect(screen.getByRole("link", { name: "Swap" })).toHaveAttribute(
      "href",
      "/swap?from=rh%3AETH",
    );
    expect(screen.getByRole("button", { name: "Buy" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Sell" })).toBeEnabled();
  });

  it("trades a meme on its curve until it graduates, then points to Swap", () => {
    renderAt("/asset/rh-ORCHARD");
    expect(screen.getByRole("button", { name: "Buy" })).toBeEnabled();
    cleanup();
    renderAt("/asset/rh-CHIPDOG");
    expect(screen.getByRole("button", { name: "Buy" })).toBeDisabled();
    expect(
      screen.getByText("CHIPDOG has graduated from its curve; trade it on Swap."),
    ).toBeInTheDocument();
  });

  it("can't send an asset from another network", () => {
    renderAt("/asset/sol-SOL");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("describes memes as fictional, with launchpad facts", () => {
    renderAt("/asset/rh-ORCHARD");
    expect(screen.getByRole("region", { name: "About" })).toHaveTextContent("fictional");
    expect(screen.getByText("47% filled")).toBeInTheDocument();
  });

  it("grades a meme on the Rug Radar with a finding per factor", () => {
    renderAt("/asset/rh-ROBOTAXI");
    const radar = screen.getByRole("region", { name: "Rug Radar" });
    expect(within(radar).getByLabelText("Grade F")).toBeInTheDocument();
    expect(radar).toHaveTextContent("0 of 100");
    expect(within(radar).getAllByRole("listitem")).toHaveLength(6);
    expect(radar).toHaveTextContent("copies CHIPDOG's bytecode");
    expect(within(radar).getAllByRole("img", { name: "Danger" }).length).toBeGreaterThan(0);
  });

  it("shows the Rug Radar only on meme pages", () => {
    renderAt("/asset/rh-NVDA");
    expect(screen.queryByRole("region", { name: "Rug Radar" })).not.toBeInTheDocument();
  });

  it("opens a complete page for every asset in the catalog", () => {
    for (const asset of assets) {
      renderAt(assetPath(asset));
      expect(screen.getByRole("heading", { level: 1, name: asset.name })).toBeInTheDocument();
      expect(screen.getByRole("slider", { name: new RegExp(`price`) })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Key stats" })).toBeInTheDocument();
      cleanup();
    }
  });

  it("treats an unknown asset as not found", () => {
    renderAt("/asset/rh-NOPE");
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
  });

  describe("stock tokens", () => {
    it("show the weekend gap: closed listing, countdown and premium to Friday's close", () => {
      renderAt(
        "/asset/rh-NVDA",
        new Date(scenarios["weekend-gap"].at),
        scenarios["weekend-gap"].seed,
      );
      const clock = screen.getByRole("region", { name: "Market clock" });
      expect(within(clock).getByText("Closed for the weekend")).toBeInTheDocument();
      // Saturday noon in New York; the listing opens Monday 9:30 AM.
      expect(within(clock).getByText("Opens in 1d 21h")).toBeInTheDocument();
      expect(within(clock).getByText("Friday's close")).toBeInTheDocument();
      expect(within(clock).getByTestId("market-gap")).toHaveTextContent(
        /On-chain is at a \d+\.\d{2}% premium to Friday's close/,
      );
    });

    it("say the token follows the listing while it is open", () => {
      renderAt("/asset/rh-NVDA");
      const clock = screen.getByRole("region", { name: "Market clock" });
      expect(within(clock).getByText("NYSE open")).toBeInTheDocument();
      expect(within(clock).getByText("Closes in 4h 0m")).toBeInTheDocument();
    });

    it("show shares gained from reinvested dividends and the action timeline", () => {
      renderAt("/asset/rh-NVDA");
      const drip = screen.getByRole("region", { name: "Dividend drip" });
      expect(within(drip).getByTestId("shares-per-token")).toHaveTextContent("1.000054");
      expect(within(drip).getByTestId("shares-gained")).toHaveTextContent("0.00067 shares");
      const timeline = within(drip).getByRole("list", { name: "Corporate actions" });
      expect(
        within(timeline)
          .getAllByRole("listitem")
          .map((li) => li.textContent),
      ).toEqual([
        "Dividend reinvestedSep 5, 2026 · 1.000054 per token (+0.000054)",
        "LaunchedJul 1, 2026 · 1 per token",
      ]);
    });

    it("don't count a split as shares gained", () => {
      renderAt("/asset/rh-TSLA");
      const drip = screen.getByRole("region", { name: "Dividend drip" });
      expect(within(drip).getByTestId("shares-per-token")).toHaveTextContent("3");
      expect(drip).toHaveTextContent("No dividends reinvested yet.");
    });

    it("aren't shown for other kinds of asset", () => {
      renderAt("/asset/rh-ETH");
      expect(screen.queryByRole("region", { name: "Market clock" })).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Dividend drip" })).not.toBeInTheDocument();
    });
  });

  describe("trading", () => {
    // The sheet is lazy; transform it once up front so no test pays that cost inside its wait.
    beforeAll(async () => {
      await import("./TradeSheet");
    });

    const flush = async () => {
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    };

    it("buys by dollars and updates both balances", async () => {
      const providers = testProviders();
      const router = createMemoryRouter([{ path: "/asset/:slug", Component: AssetPage }], {
        initialEntries: ["/asset/rh-NVDA"],
      });
      render(
        <ProvidersContext.Provider value={providers}>
          <RouterProvider router={router} />
        </ProvidersContext.Provider>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Buy" }));
      const sheet = await screen.findByRole("dialog", { name: "Buy NVDA" });
      await userEvent.type(
        within(sheet).getByRole("textbox", { name: "Amount in dollars" }),
        "100",
      );
      expect(sheet).toHaveTextContent("Cost$100.00");
      expect(within(sheet).queryByTestId("gap-notice")).not.toBeInTheDocument();
      await userEvent.click(within(sheet).getByRole("button", { name: "Review buy" }));
      await act(async () => {
        await flush();
        providers.clock.advance(350);
        await flush();
        providers.clock.advance(1400);
        await flush();
      });
      const held = (id: string) =>
        providers.chain.balances("main").find((h) => h.assetId === id)?.quantity.base ?? 0n;
      expect(held("rh:USDG")).toBe(8_020_000_000n);
      expect(held("rh:NVDA")).toBeGreaterThan(12_408_000_000_000_000_000n);
    });

    it("warns about the gap when the listing is closed on the weekend", async () => {
      renderAt(
        "/asset/rh-NVDA",
        new Date(scenarios["weekend-gap"].at),
        scenarios["weekend-gap"].seed,
      );
      await userEvent.click(screen.getByRole("button", { name: "Buy" }));
      const sheet = await screen.findByRole("dialog", { name: "Buy NVDA" });
      expect(within(sheet).getByTestId("gap-notice")).toHaveTextContent(
        /The NYSE is closed for the weekend\. You trade at the on-chain price, \d+\.\d{2}% above Friday's close/,
      );
    });

    it("orders by shares through the multiplier and refuses to oversell", async () => {
      renderAt("/asset/rh-NVDA");
      await userEvent.click(screen.getByRole("button", { name: "Sell" }));
      const sheet = await screen.findByRole("dialog", { name: "Sell NVDA" });
      await userEvent.click(within(sheet).getByRole("radio", { name: "Shares" }));
      await userEvent.type(within(sheet).getByRole("textbox", { name: "Amount in shares" }), "2");
      expect(sheet).toHaveTextContent("Shares per token1.000054");
      expect(sheet).toHaveTextContent("(1.999999 shares)");
      await userEvent.clear(within(sheet).getByRole("textbox", { name: "Amount in shares" }));
      await userEvent.type(within(sheet).getByRole("textbox", { name: "Amount in shares" }), "20");
      expect(within(sheet).getByTestId("trade-problem")).toHaveTextContent(
        "You don't hold that much NVDA",
      );
    });
  });
});
