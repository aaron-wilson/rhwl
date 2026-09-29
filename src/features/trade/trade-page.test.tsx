import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { stockTokens } from "../../data/stocks";
import { testProviders } from "../../test/providers";
import { TradePage } from "./TradePage";

function renderTrade() {
  const router = createMemoryRouter([{ path: "/trade", Component: TradePage }], {
    initialEntries: ["/trade"],
  });
  render(
    <ProvidersContext.Provider value={testProviders()}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
}

describe("TradePage", () => {
  it("lists every Stock Token from the catalog with a live price and change", () => {
    renderTrade();
    const list = screen.getByRole("list", { name: "Stock Tokens" });
    const links = within(list).getAllByRole("link");
    expect(links).toHaveLength(stockTokens.length);
    expect(links[0]).toHaveAttribute("href", "/asset/rh-NVDA");
    expect(links[0]).toHaveTextContent(/NVDA.*\$\d+\.\d{2}[+−]\d+\.\d{2}%/);
  });

  it("lists Robinhood Chain crypto", async () => {
    renderTrade();
    await userEvent.click(screen.getByRole("radio", { name: "Crypto" }));
    const list = screen.getByRole("list", { name: "Crypto" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((l) => l.getAttribute("href")),
    ).toEqual(["/asset/rh-ETH", "/asset/rh-WBTC"]);
  });
});
