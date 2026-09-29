import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { balancesHiddenStore } from "../privacy";
import { ConnectedSitesPage } from "./ConnectedSitesPage";
import { connectDapp, connectionsStore } from "./connections-store";
import { DappPage } from "./DappPage";

const at = new Date("2026-09-29T16:00:00Z");

function mount(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/connected-sites", Component: ConnectedSitesPage },
      { path: "/browse/:id", Component: DappPage },
    ],
    { initialEntries: [path] },
  );
  render(
    <ProvidersContext.Provider value={testProviders()}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
}

function connectBoth() {
  connectDapp({
    dappId: "hood-swap",
    account: "main",
    chain: "robinhood",
    permissions: ["view"],
    connectedAt: at,
  });
  connectDapp({
    dappId: "lendwell",
    account: "degen",
    chain: "arbitrum",
    permissions: ["view"],
    connectedAt: at,
  });
}

describe("connected sites", () => {
  it("says when no site is connected", () => {
    mount("/connected-sites");
    expect(screen.getByText("No site is connected.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Apps" })).toHaveAttribute("href", "/browse");
  });

  it("lists each site with its account and network, and disconnects one", async () => {
    connectBoth();
    mount("/connected-sites");
    const list = screen.getByRole("list", { name: "Connected sites" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(list).toHaveTextContent("lendwell.fi · Degen · Arbitrum One");
    await userEvent.click(screen.getByRole("button", { name: "Disconnect lendwell.fi" }));
    expect(connectionsStore.get().map((c) => c.dappId)).toEqual(["hood-swap"]);
  });

  it("disconnects every site at once", async () => {
    connectBoth();
    mount("/connected-sites");
    await userEvent.click(screen.getByRole("button", { name: "Disconnect all" }));
    expect(connectionsStore.get()).toEqual([]);
    expect(screen.getByText("No site is connected.")).toBeInTheDocument();
  });

  it("lets a connected site read a balance, masked while balances are hidden", async () => {
    connectBoth();
    balancesHiddenStore.set(true);
    mount("/browse/hood-swap");
    await userEvent.click(screen.getByRole("button", { name: "Check my USDG" }));
    expect(screen.getByTestId("site-balance")).toHaveTextContent("Hidden amount");
  });
});
