import { render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { createDemoClipboard } from "../../adapters/demo/clipboard";
import { ProvidersContext } from "../../app/providers-context";
import { accounts, hardwareAccount } from "../../data/accounts";
import type { Clipboard } from "../../ports/clipboard";
import { toChecksumAddress } from "../../domain/keys/checksum";
import { PortError } from "../../ports/errors";
import { testProviders } from "../../test/providers";
import { qrPath } from "../../ui/qr";
import { useToasts } from "../../ui/toast";
import { addAccount } from "../accounts/accounts-store";
import { setActiveAccount } from "../accounts/active-account";
import { ReceivePage } from "./ReceivePage";

function renderReceive(clipboard?: Clipboard) {
  const base = testProviders();
  const providers = { ...base, clipboard: clipboard ?? base.clipboard };
  const router = createMemoryRouter([{ path: "/receive", Component: ReceivePage }], {
    initialEntries: ["/receive"],
  });
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return providers;
}
const MAIN = toChecksumAddress(accounts[0]?.address ?? "");
const toasts = () => renderHook(() => useToasts()).result.current.map((t) => t.message);
const qrValue = () =>
  screen.getByRole("img", { name: /QR code for/ }).getAttribute("data-qr-value");

describe("qrPath", () => {
  it("draws a valid QR grid with the three finder patterns", () => {
    const { size, d } = qrPath("ethereum:0x8f3a41c2b7d9e05a6f1c3b2d4e8a9f07c6b5c21e@4663");
    expect(size).toBeGreaterThanOrEqual(21);
    expect((size - 17) % 4).toBe(0);
    for (const [x, y] of [
      [0, 0],
      [size - 7, 0],
      [0, size - 7],
    ]) {
      expect(d).toContain(`M${x} ${y}h1v1h-1z`);
    }
  });
});

describe("ReceivePage", () => {
  it.each([...accounts, hardwareAccount].map((a) => [a.name, a] as const))(
    "renders a Robinhood Chain QR code for %s",
    (_, account) => {
      addAccount(account);
      setActiveAccount(account.id);
      renderReceive();
      expect(qrValue()).toBe(`ethereum:${toChecksumAddress(account.address)}@4663`);
      expect(screen.getByTestId("receive-address")).toHaveTextContent(
        toChecksumAddress(account.address),
      );
    },
  );

  it("copies the address with a haptic and a confirmation", async () => {
    const providers = renderReceive();
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(providers.clipboard).toMatchObject({ copied: [MAIN] });
    expect(providers.haptics.played).toEqual(["success"]);
    expect(toasts()).toContain("Address copied");
  });

  it("says so when the browser refuses to copy", async () => {
    renderReceive({
      copy: () => Promise.reject(new PortError("clipboard", "denied", "refused")),
    });
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(toasts()).toContain("Couldn't copy. Select the address and copy it yourself.");
  });

  it("shares the address", async () => {
    const providers = renderReceive();
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(providers.share).toMatchObject({
      shared: [{ title: "you.rh on Robinhood Chain", text: MAIN }],
    });
  });

  it("switches networks, with a warning for each", async () => {
    renderReceive();
    expect(screen.getByRole("note")).toHaveTextContent("Only send assets on Robinhood Chain");
    await userEvent.click(screen.getByRole("button", { name: "Base" }));
    expect(qrValue()).toBe(`ethereum:${MAIN}@8453`);
    expect(screen.getByRole("note")).toHaveTextContent(
      "bridge them to use them on Robinhood Chain",
    );
    await userEvent.click(screen.getByRole("button", { name: "Solana" }));
    expect(qrValue()).toBe(`solana:${accounts[0]?.solanaAddress}`);
    expect(screen.getByRole("note")).toHaveTextContent("Only send Solana assets");
  });

  it("offers Solana only to accounts that have a Solana address", () => {
    setActiveAccount("degen");
    renderReceive();
    const networks = screen.getByRole("group", { name: "Network" });
    expect(within(networks).queryByRole("button", { name: "Solana" })).not.toBeInTheDocument();
  });

  it("builds a request link that opens Send filled in", async () => {
    const providers = renderReceive(createDemoClipboard());
    await userEvent.type(screen.getByLabelText("Amount"), "25");
    const request = screen.getByTestId("request-link");
    const value = within(request).getByRole("img").getAttribute("data-qr-value") ?? "";
    const url = new URL(value);
    expect(url.pathname).toBe("/send");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      to: MAIN,
      chain: "robinhood",
      asset: "rh:USDG",
      amount: "25",
    });
    await userEvent.click(within(request).getByRole("button", { name: "Copy link" }));
    expect(providers.clipboard).toMatchObject({ copied: [value] });
  });

  it("explains an amount it can't request", async () => {
    renderReceive();
    await userEvent.type(screen.getByLabelText("Amount"), "0.0000001");
    expect(screen.getByRole("alert")).toHaveTextContent("at most 6 decimal places");
    expect(screen.queryByTestId("request-link")).not.toBeInTheDocument();
  });
});
