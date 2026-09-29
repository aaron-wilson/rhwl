import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { memeTokens } from "../../data/memes";
import type { MemeToken } from "../../data/types";
import { amount } from "../../domain/money/amount";
import { testProviders } from "../../test/providers";
import { buyOnLaunch, launchStore, sellOnLaunch } from "./launch-store";
import { LaunchPage } from "./LaunchPage";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
const meme = (id: string): MemeToken => {
  const asset = assetById(id);
  if (asset.kind !== "meme") throw new Error(id);
  return asset;
};
const eth = (text: bigint) => amount(text, 18);
const settle = async (p: ReturnType<typeof testProviders>) => {
  await flush();
  p.clock.advance(350);
  await flush();
  p.clock.advance(1400);
  await flush();
};

function renderLaunch(p = testProviders()) {
  const router = createMemoryRouter([{ path: "/launch", Component: LaunchPage }], {
    initialEntries: ["/launch"],
  });
  render(
    <ProvidersContext.Provider value={p}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return p;
}
const names = (section: string) =>
  within(screen.getByRole("region", { name: section }))
    .queryAllByTestId("launch-card")
    .map((card) => card.textContent);

describe("launch curve trades", () => {
  it("a buy that crosses the threshold graduates the token and spends only what it takes", async () => {
    const p = testProviders();
    const ethBefore =
      p.chain.balances("main").find((h) => h.assetId === "rh:ETH")?.quantity.base ?? 0n;
    const done = buyOnLaunch(p, "main", meme("rh:TENDIES"), eth(1_000_000_000_000_000_000n));
    await settle(p);
    expect(await done).toBe(true);
    expect(launchStore.get().curves["rh:TENDIES"]?.sold).toBe(800_000_000n * 10n ** 18n);
    expect(launchStore.get().graduatedAt["rh:TENDIES"]).toEqual(p.clock.now());
    const ethAfter =
      p.chain.balances("main").find((h) => h.assetId === "rh:ETH")?.quantity.base ?? 0n;
    // Less than the full 1 ETH left: the curve only took what filling it cost.
    expect(ethBefore - ethAfter).toBeLessThan(1_000_000_000_000_000_000n);
    expect(ethBefore - ethAfter).toBeGreaterThan(0n);
  });

  it("sells back into the curve for the quote asset", async () => {
    const p = testProviders();
    const bought = buyOnLaunch(p, "main", meme("rh:PAWS"), eth(10_000_000_000_000_000n));
    await settle(p);
    await bought;
    const held = p.chain.balances("main").find((h) => h.assetId === "rh:PAWS")?.quantity;
    if (held === undefined) throw new Error("nothing bought");
    const before = launchStore.get().curves["rh:PAWS"]?.sold ?? 0n;
    const sold = sellOnLaunch(p, "main", meme("rh:PAWS"), held);
    await settle(p);
    expect(await sold).toBe(true);
    expect(launchStore.get().curves["rh:PAWS"]?.sold).toBe(before - held.base);
  });
});

describe("LaunchPage", () => {
  it("lists every launch from the catalog, on the curve or graduated", () => {
    renderLaunch();
    const total = names("On the curve").length + names("Graduated").length;
    expect(total).toBe(memeTokens.length);
    expect(names("Graduated").join()).toContain("Chip Dog");
    expect(names("On the curve")[0]).toContain("Tendies");
  });

  it("puts a Rug Radar grade chip on every card", () => {
    renderLaunch();
    const cards = screen.getAllByTestId("launch-card");
    expect(cards).toHaveLength(memeTokens.length);
    cards.forEach((card) => {
      expect(card.textContent).toMatch(/Radar [ABCDF]/);
    });
    const hoodie = cards.find((c) => c.textContent.includes("Hoodie"));
    expect(hoodie).toHaveTextContent("Radar A");
  });

  it.each([
    ["Stock-paired", ["Orchard", "Robotaxi", "Hoodie", "Seal Team"], ["Tendies", "Diamond Paws"]],
    ["ETH-quoted", ["Tendies", "Diamond Paws"], ["Orchard"]],
    ["Graduating soon", ["Tendies", "Hoodie"], ["Orchard", "Robotaxi"]],
    ["New", ["Diamond Paws", "Seal Team", "Robotaxi"], ["Orchard", "Tendies"]],
  ])("filters %s", async (filter, shown, hidden) => {
    renderLaunch();
    await userEvent.click(screen.getByRole("button", { name: filter }));
    const text = names("On the curve").join("|");
    shown.forEach((name) => {
      expect(text).toContain(name);
    });
    hidden.forEach((name) => {
      expect(text).not.toContain(name);
    });
  });

  it("moves a launch to Graduated and celebrates when a buy fills its curve", async () => {
    const p = renderLaunch();
    expect(names("On the curve").join()).toContain("Tendies");
    await act(async () => {
      const done = buyOnLaunch(p, "main", meme("rh:TENDIES"), eth(1_000_000_000_000_000_000n));
      await settle(p);
      await done;
    });
    expect(names("On the curve").join()).not.toContain("Tendies");
    const card = within(screen.getByRole("region", { name: "Graduated" }))
      .getAllByTestId("launch-card")
      .find((c) => c.textContent.includes("Tendies"));
    expect(card).toHaveTextContent("Just graduated");
    expect(card?.className).toContain("animate-graduate");
  });
});
