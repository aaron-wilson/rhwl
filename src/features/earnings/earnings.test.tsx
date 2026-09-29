import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { valueInCents } from "../../domain/money/amount";
import { formatFiat } from "../../domain/money/format";
import { testProviders } from "../../test/providers";
import { EarningsNightPage } from "./EarningsNightPage";
import { EarningsPage } from "./EarningsPage";

const night = new Date("2026-11-18T21:30:00Z");

function open(path: string, at: Date) {
  const providers = testProviders(at);
  const router = createMemoryRouter(
    [
      { path: "/earnings", Component: EarningsPage },
      { path: "/earnings/:slug", Component: EarningsNightPage },
    ],
    { initialEntries: [path] },
  );
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return providers;
}

describe("Earnings Sweat Mode", () => {
  it("opens NVDA's night with the token, paired memes and a correct combined total", () => {
    const p = open("/earnings/rh-NVDA", night);
    const value = (id: string) => {
      const held = p.chain.balances("main").find((h) => h.assetId === id)?.quantity;
      return held === undefined ? 0n : valueInCents(held, p.market.price(id, night));
    };
    const total = value("rh:NVDA") + value("rh:CHIPDOG") + value("rh:BASKET");
    const exposure = screen.getByTestId("exposure");
    expect(exposure).toHaveTextContent(`NVDA tokens${formatFiat(value("rh:NVDA"))}`);
    expect(exposure).toHaveTextContent(`CHIPDOG (paired)${formatFiat(value("rh:CHIPDOG"))}`);
    expect(exposure).toHaveTextContent(`BASKET (paired)${formatFiat(value("rh:BASKET"))}`);
    expect(exposure).toHaveTextContent(`Combined${formatFiat(total)}`);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("NVDA earnings");
    expect(screen.getByText("Tonight, after the close")).toBeInTheDocument();
    expect(screen.getByText(/After hours on-chain price/)).toBeInTheDocument();
  });

  it("lists held stocks and stocks paired to held memes, and marks tonight", () => {
    open("/earnings", night);
    const calendar = screen.getByRole("list", { name: "Earnings calendar" });
    const nvda = within(calendar)
      .getAllByRole("listitem")
      .find((li) => li.textContent.includes("Paired: CHIPDOG"));
    expect(nvda).toHaveTextContent("Held · Paired: CHIPDOG, BASKET");
    expect(nvda).toHaveTextContent("Tonight");
  });
});
