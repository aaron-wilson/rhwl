import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { EarnPage } from "./EarnPage";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

function renderEarn() {
  const providers = testProviders();
  const router = createMemoryRouter([{ path: "/earn", Component: EarnPage }], {
    initialEntries: ["/earn"],
  });
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return providers;
}
const settle = async (p: ReturnType<typeof testProviders>) => {
  await act(async () => {
    await flush();
    p.clock.advance(350);
    await flush();
    p.clock.advance(1400);
    await flush();
  });
};

describe("EarnPage", () => {
  it("asks for the risk disclosure before the first deposit", async () => {
    renderEarn();
    await userEvent.type(screen.getByRole("textbox", { name: "Amount in USDG" }), "1000");
    await userEvent.click(screen.getByRole("button", { name: "Deposit" }));
    const sheet = await screen.findByRole("dialog", { name: "Before you deposit" });
    expect(sheet).toHaveTextContent("not insured");
    const next = within(sheet).getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    await userEvent.click(within(sheet).getByRole("checkbox"));
    await userEvent.click(next);
    expect(screen.queryByRole("dialog", { name: "Before you deposit" })).not.toBeInTheDocument();
  });

  it("earns by the APY formula over a fast-forwarded week, then withdraws", async () => {
    const p = renderEarn();
    await userEvent.type(screen.getByRole("textbox", { name: "Amount in USDG" }), "1000");
    await userEvent.click(screen.getByRole("button", { name: "Deposit" }));
    const sheet = await screen.findByRole("dialog", { name: "Before you deposit" });
    await userEvent.click(within(sheet).getByRole("checkbox"));
    await userEvent.click(within(sheet).getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Deposit" }));
    await settle(p);
    expect(screen.getByTestId("vault-balance")).toHaveTextContent("1,000 USDG");

    act(() => {
      p.clock.advance(7 * 24 * 3_600_000);
    });
    // 1,000 × (1.07^(7/365) − 1) = 1.2984 USDG.
    expect(screen.getByTestId("vault-earned")).toHaveTextContent("Earned 1.2984 USDG");

    await userEvent.click(screen.getByRole("radio", { name: "Withdraw" }));
    await userEvent.click(screen.getByRole("button", { name: "Max" }));
    await userEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    await settle(p);
    const usdg = p.chain.balances("main").find((h) => h.assetId === "rh:USDG")?.quantity.base;
    expect(usdg).toBeGreaterThan(8_121_000_000n);
  });
});
