import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { txStore } from "../transactions";
import { approvalsStore, recordApproval, revokeRequest } from "./approvals-store";
import { ApprovalsPage } from "./ApprovalsPage";

function mount() {
  const providers = testProviders();
  const router = createMemoryRouter([{ path: "/approvals", Component: ApprovalsPage }], {
    initialEntries: ["/approvals"],
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

describe("ApprovalsPage", () => {
  it("lists the account's approvals riskiest first, with reasons", () => {
    mount();
    const rows = within(screen.getByRole("list", { name: "Approvals" })).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("Dangerous");
    expect(rows[0]).toHaveTextContent("Spender has drained other wallets");
    expect(rows[0]).toHaveTextContent("Arbitrum One");
  });

  it("selects the risky ones and revokes them in one signature", async () => {
    const providers = mount();
    await userEvent.click(screen.getByRole("button", { name: "Select risky" }));
    const revoke = screen.getByRole("button", { name: "Revoke 3 in one signature" });
    await userEvent.click(revoke);
    await act(async () => {
      await flush();
      providers.clock.advance(350);
      await flush();
      providers.clock.advance(1400);
      await flush();
    });
    const tx = txStore.get()[0];
    expect(tx?.request.legs).toHaveLength(3);
    expect(tx?.machine.state).toBe("confirmed");
    expect(approvalsStore.get().map((a) => a.id)).toEqual(["a1", "a2", "a6"]);
    expect(
      within(screen.getByRole("list", { name: "Approvals" })).getAllByRole("listitem"),
    ).toHaveLength(2);
  });
});

describe("approvals store", () => {
  it("replaces an earlier grant to the same spender", () => {
    const first = approvalsStore.get()[0];
    if (first === undefined) throw new Error("seed");
    recordApproval({ ...first, id: "new", allowance: "unlimited" });
    const same = approvalsStore
      .get()
      .filter((a) => a.spender === first.spender && a.account === "main");
    expect(same.map((a) => a.id)).toEqual(["new"]);
  });

  it("names each revoked grant as a leg without amounts", () => {
    const request = revokeRequest(approvalsStore.get().slice(0, 2));
    expect(request.summary.verb).toBe("Revoke 2 approvals");
    expect(request.legs?.map((l) => `${l.summary.verb} ${l.summary.detail ?? ""}`)).toEqual([
      "Revoke USDG for Hood Swap on Robinhood Chain",
      "Revoke USDG for Perps on Robinhood Chain",
    ]);
  });
});
