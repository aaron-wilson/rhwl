import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { TaxPage } from "./TaxPage";

function mount() {
  const providers = testProviders();
  const router = createMemoryRouter([{ path: "/tax", Component: TaxPage }], {
    initialEntries: ["/tax"],
  });
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return providers;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TaxPage", () => {
  it("lists lots per asset with realized and unrealized totals", () => {
    mount();
    const list = screen.getByRole("list", { name: "Lots by asset" });
    expect(within(list).getByText("NVDA")).toBeInTheDocument();
    expect(within(list).queryByText("USDG")).not.toBeInTheDocument();
    expect(screen.getByTestId("tax-totals")).toHaveTextContent(/Realized[+−]?\$[\d,]+\.\d{2}/);
    expect(screen.getByTestId("tax-totals")).toHaveTextContent(/Unrealized[+−]\$[\d,]+\.\d{2}/);
  });

  it("exports the lots as a CSV file through the Share port, downloading where it can't share files", async () => {
    const created = vi.fn(() => "blob:lots");
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: vi.fn() });
    const providers = mount();
    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Exported lots-2026-09-29.csv");
    const [shared] = providers.share.shared;
    const file = shared?.files?.[0];
    expect(file?.name).toBe("lots-2026-09-29.csv");
    expect(file?.type).toBe("text/csv");
    expect((await file?.text())?.split("\r\n")[0]).toBe(
      "asset,acquired,quantity,cost_usd,sold,proceeds_usd,gain_usd,status",
    );
    expect(created).toHaveBeenCalledTimes(1);
  });
});
