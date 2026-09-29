import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { scenarios } from "../../app/startup";
import { testProviders } from "../../test/providers";
import { GapRadar } from "./GapRadar";

function renderRadar(start: Date, seed?: string) {
  const providers = testProviders(start, seed);
  const router = createMemoryRouter([{ path: "/", Component: GapRadar }]);
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return providers.clock;
}

describe("GapRadar", () => {
  it("is hidden during the regular session and appears when the clock reaches Saturday", () => {
    // Friday Oct 2, 3:00 PM New York.
    const clock = renderRadar(new Date("2026-10-02T19:00:00Z"));
    expect(screen.queryByRole("region", { name: /gap/ })).not.toBeInTheDocument();
    act(() => {
      clock.advance(24 * 3_600_000);
    });
    const card = screen.getByRole("region", { name: "Weekend gap" });
    expect(card).toHaveTextContent("since Friday's close");
    expect(card).toHaveTextContent("4 stock tokens, 2 paired memes drifting from the listing");
  });

  it("says overnight between sessions", () => {
    // Tuesday Sep 29, 11:00 PM New York.
    renderRadar(new Date("2026-09-30T03:00:00Z"));
    expect(screen.getByRole("region", { name: "Overnight gap" })).toHaveTextContent(
      "since Tuesday's close",
    );
  });

  it("opens the line-by-line detail", async () => {
    const { at, seed } = scenarios["weekend-gap"];
    renderRadar(new Date(at), seed);
    expect(screen.getByTestId("gap-total")).toHaveTextContent(/^\+\$/);
    await userEvent.click(screen.getByRole("button", { name: /Weekend gap/ }));
    const sheet = await screen.findByRole("dialog", { name: "Weekend gap" });
    const stocks = within(sheet).getByRole("region", { name: "Stock Tokens" });
    expect(within(stocks).getAllByRole("link")).toHaveLength(4);
    const memes = within(sheet).getByRole("region", { name: "Paired memes" });
    expect(within(memes).getByRole("link", { name: /Chip Dog/ })).toHaveAttribute(
      "href",
      "/asset/rh-CHIPDOG",
    );
  });
});
