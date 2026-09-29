import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { hideSmallStore } from "../../app/preferences";
import { assetById } from "../../data/assets";
import { amount } from "../../domain/money/amount";
import { HoldingsList } from "./HoldingsList";
import type { HoldingRow } from "./usePortfolio";

const row = (id: string, valueCents: bigint): HoldingRow => ({
  asset: assetById(id),
  quantity: amount(1n, 0),
  valueCents,
  changeBps: 0n,
  spark: [1, 1],
});

function mount() {
  const rows = [row("rh:NVDA", 50_000n), row("rh:TSLA", 99n)];
  const router = createMemoryRouter([{ path: "/", element: <HoldingsList rows={rows} /> }]);
  render(<RouterProvider router={router} />);
}

describe("hide small balances", () => {
  it("shows every holding by default", () => {
    mount();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("leaves holdings under $1 out when switched on", () => {
    hideSmallStore.set(true);
    mount();
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual([
      "/asset/rh-NVDA",
    ]);
  });
});
