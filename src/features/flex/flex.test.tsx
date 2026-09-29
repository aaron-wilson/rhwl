import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { encodeCard, verifyQuery, type FlexCard } from "../../domain/flex/card";
import { signMessage } from "../../domain/keys/signature";
import { amount } from "../../domain/money/amount";
import { VerifyPage } from "./VerifyPage";

const card: FlexCard = {
  account: "main",
  accountName: "you.rh",
  assetId: "rh:CHIPDOG",
  symbol: "CHIPDOG",
  pnlBps: 4210n,
  pnlCents: 12_345n,
  entry: amount(190_000n, 8),
  mark: amount(270_000n, 8),
  at: new Date("2026-09-29T16:00:00.000Z"),
};

function openLink(query: string) {
  const router = createMemoryRouter([{ path: "/verify", Component: VerifyPage }], {
    initialEntries: [`/verify?${query}`],
  });
  render(<RouterProvider router={router} />);
}

describe("VerifyPage", () => {
  it("verifies a card cold, from the link alone", async () => {
    const text = encodeCard(card);
    openLink(verifyQuery(text, signMessage("main", text)));
    expect(await screen.findByTestId("verify-result")).toHaveTextContent(
      "Verified: signed by you.rh",
    );
    expect(screen.getByTestId("flex-pnl")).toHaveTextContent("+42.10%");
    expect(screen.getByRole("figure")).toHaveTextContent("+$123.45");
  });

  it("flags a card edited after signing", async () => {
    const text = encodeCard(card);
    const signature = signMessage("main", text);
    openLink(verifyQuery(encodeCard({ ...card, pnlBps: 9210n }), signature));
    expect(await screen.findByTestId("verify-result")).toHaveTextContent(
      "Not verified: this card was changed after it was signed",
    );
  });

  it("flags a card signed by a different account's key", async () => {
    const text = encodeCard(card);
    openLink(verifyQuery(text, signMessage("degen", text)));
    expect(await screen.findByTestId("verify-result")).toHaveTextContent("Not verified");
  });

  it("says so when the link holds no card", () => {
    openLink("card=nonsense&sig=0x1");
    expect(screen.getByRole("alert")).toHaveTextContent("doesn't hold a readable card");
  });
});
