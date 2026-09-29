import { createDemoChain } from "../../adapters/demo/chain";
import { createDemoSimulation } from "../../adapters/demo/simulation";
import { genesis } from "../../data/accounts";
import { pastTransactions } from "../../data/history";
import { DEFAULT_SEED } from "../../data/world";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { SecurityPage } from "./SecurityPage";

function mount() {
  const base = testProviders();
  const chain = createDemoChain({
    clock: base.clock,
    seed: DEFAULT_SEED,
    genesis,
    history: pastTransactions,
  });
  const providers = { ...base, chain, simulation: createDemoSimulation(chain) };
  const router = createMemoryRouter([{ path: "/security", Component: SecurityPage }], {
    initialEntries: ["/security"],
  });
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return providers;
}
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
const score = () =>
  screen.getByRole("meter", { name: "Security score" }).getAttribute("aria-valuenow");

describe("SecurityPage", () => {
  it("scores the demo account and lists what is missing", () => {
    mount();
    expect(score()).toBe("30");
    const list = screen.getByRole("list", { name: "Security checklist" });
    expect(
      within(list)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([
      "Verify with passkey",
      "Set trade limits",
      "Revoke risky approvals",
      "Flag as scams",
    ]);
    expect(list).toHaveTextContent("0x7a2c…3f19 imitates stonks.rh");
  });

  it("raises the score to 100 as each fix is applied", async () => {
    const providers = mount();
    await userEvent.click(screen.getByRole("button", { name: "Set trade limits" }));
    expect(score()).toBe("45");
    await userEvent.click(screen.getByRole("button", { name: "Flag as scams" }));
    expect(score()).toBe("60");
    await userEvent.click(screen.getByRole("button", { name: "Verify with passkey" }));
    // Signing loads the curve code first, so wait for the score rather than a fixed tick.
    await waitFor(() => {
      expect(score()).toBe("80");
    });
    await userEvent.click(screen.getByRole("button", { name: "Revoke risky approvals" }));
    await act(async () => {
      await flush();
      providers.clock.advance(350);
      await flush();
      providers.clock.advance(1400);
      await flush();
    });
    expect(score()).toBe("100");
    expect(screen.queryAllByRole("button", { name: /./ }).filter((b) => b.closest("ul"))).toEqual(
      [],
    );
  });
});
