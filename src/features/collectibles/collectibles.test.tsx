import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { txStore } from "../transactions/tx-store";
import { burnCollectible, sendCollectible } from "./burn";
import { CollectiblePage } from "./CollectiblePage";
import { CollectiblesPage } from "./CollectiblesPage";
import { collectiblesStore } from "./collectibles-store";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
const owned = (account: string) =>
  collectiblesStore
    .get()
    .items.filter((i) => i.owner === account)
    .map((i) => i.id);

function renderAt(path: string) {
  const providers = testProviders();
  const router = createMemoryRouter(
    [
      { path: "/collectibles", Component: CollectiblesPage },
      { path: "/collectibles/:id", Component: CollectiblePage },
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

describe("burnCollectible", () => {
  it("burns through the transaction lifecycle, paying only the fee", async () => {
    const p = testProviders();
    const done = burnCollectible(p, "chainlets-412");
    await flush();
    expect(collectiblesStore.get().leaving).toEqual(["chainlets-412"]);
    expect(txStore.get()[0]?.request).toMatchObject({
      kind: "contract",
      summary: { verb: "Burned", detail: "Chainlets #412" },
      deltas: [],
      collectibles: [{ id: "chainlets-412", name: "Chainlets #412" }],
    });
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    expect(await done).toBe(true);
    expect(owned("main")).not.toContain("chainlets-412");
    expect(collectiblesStore.get().leaving).toEqual([]);
  });

  it("puts the collectible back when the burn fails", async () => {
    const p = testProviders();
    p.chain.failNext("Simulated network error");
    const done = burnCollectible(p, "chainlets-412");
    await flush();
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    expect(await done).toBe(false);
    expect(owned("main")).toContain("chainlets-412");
    expect(collectiblesStore.get().leaving).toEqual([]);
  });
});

describe("sendCollectible", () => {
  async function settle(p: ReturnType<typeof testProviders>, done: Promise<boolean>) {
    await flush();
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    return done;
  }

  it("sends to an outside address through the lifecycle, paying only the fee", async () => {
    const p = testProviders();
    const to = "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3f19";
    const done = sendCollectible(p, "chainlets-412", to, "stonks.rh");
    await flush();
    expect(txStore.get()[0]?.request).toMatchObject({
      kind: "send",
      summary: { verb: "Sent", detail: "Chainlets #412 to stonks.rh" },
      deltas: [],
      to,
      collectibles: [{ id: "chainlets-412", name: "Chainlets #412" }],
    });
    expect(await settle(p, done)).toBe(true);
    expect(collectiblesStore.get().items.some((i) => i.id === "chainlets-412")).toBe(false);
  });

  it("moves it to another of the user's accounts instead of dropping it", async () => {
    const p = testProviders();
    const degen = "0x44b1d09c7e3fa2b6581c0d4e9f7a3b2c16d59e0d";
    expect(await settle(p, sendCollectible(p, "chainlets-412", degen, "Degen"))).toBe(true);
    expect(owned("main")).not.toContain("chainlets-412");
    expect(owned("degen")).toContain("chainlets-412");
  });

  it("keeps it when the send fails", async () => {
    const p = testProviders();
    p.chain.failNext("Simulated network error");
    const to = "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3f19";
    expect(await settle(p, sendCollectible(p, "chainlets-412", to, "stonks.rh"))).toBe(false);
    expect(owned("main")).toContain("chainlets-412");
    expect(collectiblesStore.get().leaving).toEqual([]);
  });
});

describe("CollectiblesPage", () => {
  it("shows the grid and keeps spam in a hidden folder with its reasons", async () => {
    renderAt("/collectibles");
    const grid = screen.getByRole("list", { name: "Collectibles" });
    expect(within(grid).getAllByRole("link")).toHaveLength(5);
    expect(within(grid).queryByText(/USDG/)).not.toBeInTheDocument();

    const folder = screen.getByRole("button", { name: /Hidden as spam \(2\)/ });
    expect(folder).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(folder);
    const spam = screen.getByRole("list", { name: "Spam" });
    expect(spam).toHaveTextContent("It asks you to visit a website");
    expect(spam).toHaveTextContent("It uses the name of USDG to look official");
  });

  it("moves an item back to the grid when marked not spam", async () => {
    renderAt("/collectibles");
    await userEvent.click(screen.getByRole("button", { name: /Hidden as spam/ }));
    const row = within(screen.getByRole("list", { name: "Spam" }))
      .getByRole("link", { name: /Free Mint Pass/ })
      .closest("li");
    if (row === null) throw new Error("No spam row");
    await userEvent.click(within(row).getByRole("button", { name: "Not spam" }));
    expect(
      within(screen.getByRole("list", { name: "Collectibles" })).getAllByRole("link"),
    ).toHaveLength(6);
    expect(screen.getByRole("button", { name: /Hidden as spam \(1\)/ })).toBeInTheDocument();
  });
});

describe("CollectiblePage", () => {
  it("shows traits with rarity and the collection's details", () => {
    renderAt("/collectibles/chainlets-412");
    expect(screen.getByRole("heading", { level: 1, name: "Chainlets #412" })).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Ultraviolet")).toBeInTheDocument();
    expect(screen.getByText("1.5% have this")).toBeInTheDocument();
    expect(screen.getByText("0.18 ETH")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Artwork for Chainlets #412" })).toBeInTheDocument();
  });

  it("reports an item as spam and takes it back", async () => {
    renderAt("/collectibles/stonk-seals-88");
    expect(screen.queryByTestId("spam-warning")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Report spam" }));
    expect(screen.getByTestId("spam-warning")).toHaveTextContent("You reported it");
    await userEvent.click(screen.getByRole("button", { name: "Not spam" }));
    expect(screen.queryByTestId("spam-warning")).not.toBeInTheDocument();
  });

  it("burns, then returns to the grid", async () => {
    const { providers, router } = renderAt("/collectibles/degen-diplomas-7");
    await userEvent.click(screen.getByRole("button", { name: "Burn" }));
    await act(async () => {
      await flush();
      providers.clock.advance(350);
      await flush();
      providers.clock.advance(1400);
      await flush();
    });
    expect(router.state.location.pathname).toBe("/collectibles");
    expect(owned("main")).not.toContain("degen-diplomas-7");
  });

  it("says so when the item is gone", () => {
    renderAt("/collectibles/nope");
    expect(screen.getByRole("heading", { name: "Not in your wallet" })).toBeInTheDocument();
  });
});
