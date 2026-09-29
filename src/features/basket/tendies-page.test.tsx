import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { SignerHost } from "../transactions/SignerHost";
import { txStore } from "../transactions/tx-store";
import { basketStore } from "./basket-store";
import { TendiesPage } from "./TendiesPage";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

function mount() {
  const providers = testProviders();
  const router = createMemoryRouter([{ path: "/tendies", Component: TendiesPage }], {
    initialEntries: ["/tendies"],
  });
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
      <SignerHost />
    </ProvidersContext.Provider>,
  );
  return providers;
}

describe("TendiesPage", () => {
  it("previews each leg and blocks weights that don't add up", async () => {
    mount();
    expect(screen.getByRole("list", { name: "Allocation" })).toHaveTextContent("NVDA");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(4);
    await userEvent.click(screen.getByRole("button", { name: "Remove ETH" }));
    expect(screen.getByTestId("weights-total")).toHaveTextContent("75% of 100%");
    expect(screen.getByRole("alert")).toHaveTextContent("Weights add up to 75.00%, not 100%.");
    expect(screen.getByRole("button", { name: /Review/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Split evenly" }));
    expect(screen.getByTestId("weights-total")).toHaveTextContent("100% of 100%");
  });

  it("adds an asset from the picker", async () => {
    mount();
    await userEvent.selectOptions(screen.getByLabelText("Add an asset"), "rh:TSLA");
    expect(basketStore.get().weights.map((w) => w.assetId)).toContain("rh:TSLA");
  });

  it("buys every leg with one signature, then watches drift", async () => {
    const providers = mount();
    await userEvent.click(screen.getByRole("button", { name: "Review 4 buys" }));
    const sheet = await screen.findByRole("dialog", { name: "Confirm with passkey" });
    const steps = within(sheet).getByRole("list", { name: "4 steps, one signature" });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(4);
    await userEvent.click(within(sheet).getByRole("button", { name: "Confirm with passkey" }));
    fireEvent(screen.getByTestId("sign-scan"), new Event("webkitAnimationEnd", { bubbles: true }));
    await act(async () => {
      await flush();
      providers.clock.advance(5_000);
      await flush();
    });
    expect(txStore.get()[0]?.machine.state).toBe("confirmed");
    expect(await screen.findByTestId("drift")).toBeInTheDocument();
  });
});
