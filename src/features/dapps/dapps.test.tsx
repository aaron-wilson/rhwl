import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { useToasts } from "../../ui/toast";
import { BrowserPage } from "./BrowserPage";
import { connectionsStore } from "./connections-store";
import { DappPage } from "./DappPage";

function Toasts() {
  return (
    <output>
      {useToasts()
        .map((t) => t.message)
        .join(" ")}
    </output>
  );
}

function mount(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/browse", Component: BrowserPage },
      { path: "/browse/:id", Component: DappPage },
    ],
    { initialEntries: [path] },
  );
  render(
    <ProvidersContext.Provider value={testProviders()}>
      <RouterProvider router={router} />
      <Toasts />
    </ProvidersContext.Provider>,
  );
}

describe("dApp browser", () => {
  it("lists the three listed sites and opens one by address", async () => {
    mount("/browse");
    const sites = screen.getByRole("list", { name: "Sites" });
    expect(within(sites).getAllByRole("listitem")).toHaveLength(3);
    expect(sites).not.toHaveTextContent("hoodswap-app.com");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Site address" }),
      "nowhere.test{Enter}",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No site at that address");
    await userEvent.clear(screen.getByRole("textbox", { name: "Site address" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Site address" }),
      "lendwell.fi{Enter}",
    );
    expect(await screen.findByTestId("site-address")).toHaveTextContent("lendwell.fi");
  });

  it("connects an account, switching the site to its network", async () => {
    mount("/browse/lendwell");
    await userEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    const sheet = screen.getByRole("dialog", { name: "Connect to Lendwell" });
    expect(within(sheet).getByTestId("connect-network")).toHaveTextContent(
      "Switches to Arbitrum One for this site",
    );
    expect(within(sheet).getByRole("list", { name: "Permissions" })).toHaveTextContent(
      "See your address and balances",
    );
    const radios = within(sheet).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("value"))).not.toContain("whale");
    await userEvent.click(radios[1] ?? sheet);
    await userEvent.click(within(sheet).getByRole("button", { name: "Connect" }));

    expect(connectionsStore.get()).toMatchObject([{ dappId: "lendwell", chain: "arbitrum" }]);
    expect(screen.getByTestId("site-session")).toHaveTextContent("Arbitrum One");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Switched to Arbitrum One for lendwell.fi",
    );
  });

  it("stays on Robinhood Chain for a site that runs there", async () => {
    mount("/browse/hood-swap");
    await userEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
    const sheet = screen.getByRole("dialog", { name: "Connect to Hood Swap" });
    expect(within(sheet).getByTestId("connect-network")).toHaveTextContent(/^Robinhood Chain$/);
    await userEvent.click(within(sheet).getByRole("button", { name: "Connect" }));
    expect(connectionsStore.get()[0]).toMatchObject({ account: "main", chain: "robinhood" });
    expect(screen.getByTestId("site-session")).toHaveTextContent("you.rh");
  });
});
