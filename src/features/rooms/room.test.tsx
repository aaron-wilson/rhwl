import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { SignerHost } from "../transactions/SignerHost";
import { RoomPage } from "./RoomPage";

function openRoom(slug: string) {
  const router = createMemoryRouter([{ path: "/rooms/:slug", Component: RoomPage }], {
    initialEntries: [`/rooms/${slug}`],
  });
  render(
    <ProvidersContext.Provider value={testProviders()}>
      <RouterProvider router={router} />
      <SignerHost />
    </ProvidersContext.Provider>,
  );
}

describe("RoomPage", () => {
  it("keeps a non-holder at the gate", () => {
    openRoom("rh-MSFT");
    expect(screen.getByRole("note")).toHaveTextContent("Only MSFT holders can join.");
    expect(screen.queryByRole("list", { name: "Messages" })).not.toBeInTheDocument();
  });

  it("lets a holder in after signing, with a badge for how long they've held", async () => {
    openRoom("rh-NVDA");
    await userEvent.click(screen.getByRole("button", { name: "Prove and join" }));
    const sheet = await screen.findByRole("dialog", { name: "Sign message" });
    expect(within(sheet).getByLabelText("Message")).toHaveTextContent("I hold NVDA");
    await userEvent.click(within(sheet).getByRole("button", { name: "Confirm with passkey" }));
    fireEvent(screen.getByTestId("sign-scan"), new Event("webkitAnimationEnd", { bubbles: true }));
    // Held since the opening balance on Aug 28; the demo clock starts on Sep 29.
    expect(await screen.findByTestId("room-badge")).toHaveTextContent("Diamond hands");
    expect(screen.getByTestId("room-badge")).toHaveTextContent("Holding for 31 days");
    expect(
      within(screen.getByRole("list", { name: "Messages" })).getAllByRole("listitem"),
    ).toHaveLength(25);
    expect(screen.getByTestId("sentiment")).toHaveTextContent(/Bullish \d+%/);
  });

  it("stays shut when the signature is refused", async () => {
    openRoom("rh-NVDA");
    await userEvent.click(screen.getByRole("button", { name: "Prove and join" }));
    await screen.findByRole("dialog", { name: "Sign message" });
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Prove and join" })).toBeInTheDocument();
  });

  it("has no room for anything but a Stock Token", () => {
    openRoom("rh-CHIPDOG");
    expect(screen.queryByRole("button", { name: "Prove and join" })).not.toBeInTheDocument();
  });
});
