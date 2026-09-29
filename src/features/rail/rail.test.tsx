import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { toDecimalString } from "../../domain/money/amount";
import { testProviders } from "../../test/providers";
import { useActivity } from "../activity/history";
import { RailPage } from "./RailPage";
import { railStore } from "./rail-store";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

function Recent() {
  const rows = useActivity("main");
  return <p data-testid="latest">{rows[0]?.summary.verb ?? ""}</p>;
}

function renderRail() {
  const providers = testProviders();
  const router = createMemoryRouter(
    [
      {
        path: "/transfer",
        element: (
          <>
            <RailPage />
            <Recent />
          </>
        ),
      },
    ],
    { initialEntries: ["/transfer"] },
  );
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
const usdg = (p: ReturnType<typeof testProviders>) => {
  const h = p.chain.balances("main").find((x) => x.assetId === "rh:USDG");
  return h === undefined ? "0" : toDecimalString(h.quantity);
};

describe("Robinhood account rail", () => {
  it("shows the custody boundary and links the account", async () => {
    const p = renderRail();
    const custody = screen.getByRole("group", { name: "Custody" });
    expect(within(custody).getByRole("region", { name: "Robinhood account" })).toHaveTextContent(
      "CustodialNot linked",
    );
    expect(within(custody).getByRole("region", { name: "you.rh" })).toHaveTextContent(
      "Self-custody",
    );
    await userEvent.click(screen.getByRole("button", { name: "Link Robinhood account" }));
    act(() => {
      p.clock.advance(800);
    });
    expect(within(custody).getByRole("region", { name: "Robinhood account" })).toHaveTextContent(
      "12,480.55 USDG",
    );
  });

  it("deposits cash as USDG without a signature and records it in Activity", async () => {
    const p = renderRail();
    act(() => {
      railStore.set((s) => ({ ...s, linked: true }));
    });
    await userEvent.type(screen.getByRole("textbox", { name: "Amount in USDG" }), "100");
    await userEvent.click(screen.getByRole("button", { name: "Move to wallet" }));
    await settle(p);
    expect(usdg(p)).toBe("8220.000000");
    expect(toDecimalString(railStore.get().balances["rh:USDG"])).toBe("12380.550000");
    expect(screen.getByTestId("latest")).toHaveTextContent("Deposited");
  });

  it("withdraws to the account and credits it once confirmed", async () => {
    const p = renderRail();
    act(() => {
      railStore.set((s) => ({ ...s, linked: true }));
    });
    await userEvent.click(screen.getByRole("radio", { name: "To Robinhood" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Amount in USDG" }), "20");
    await userEvent.click(screen.getByRole("button", { name: "Move to Robinhood" }));
    await settle(p);
    expect(usdg(p)).toBe("8100.000000");
    expect(toDecimalString(railStore.get().balances["rh:USDG"])).toBe("12500.550000");
    expect(screen.getByTestId("latest")).toHaveTextContent("Withdrew");
  });

  it("won't move more than is available", async () => {
    renderRail();
    act(() => {
      railStore.set((s) => ({ ...s, linked: true }));
    });
    await userEvent.type(screen.getByRole("textbox", { name: "Amount in USDG" }), "20000");
    expect(screen.getByText("More than is available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move to wallet" })).toBeDisabled();
  });
});
