import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { amount } from "../../domain/money/amount";
import { BasketWhatIf } from "./BasketWhatIf";
import { PerpWhatIf } from "./PerpWhatIf";
import { ValueWhatIf } from "./ValueWhatIf";

const usd = (d: bigint) => amount(d * 10n ** 8n, 8);
const press = (name: RegExp, key: string) => {
  fireEvent.keyDown(screen.getByRole("slider", { name }), { key });
};

describe("what-if slider", () => {
  it("starts at no shock and recomputes a value on every move", () => {
    render(<ValueWhatIf subject="NVDA" valueCents={100_000n} />);
    expect(screen.getByRole("heading")).toHaveTextContent("What if: NVDA 0%");
    expect(screen.getByTestId("whatif-outcome")).toHaveTextContent("Worth $1,000.00 ($0.00).");
    press(/NVDA/, "End");
    expect(screen.getByRole("heading")).toHaveTextContent("What if: NVDA +30%");
    expect(screen.getByTestId("whatif-outcome")).toHaveTextContent("Worth $1,300.00 (+$300.00).");
    press(/NVDA/, "Home");
    expect(screen.getByTestId("whatif-outcome")).toHaveTextContent("Worth $700.00 (−$300.00).");
    expect(screen.getByTestId("whatif-outcome")).toHaveAttribute("aria-live", "polite");
  });

  it("says a paired meme's outcome rests on the pair holding", () => {
    render(
      <ValueWhatIf subject="NVDA" valueCents={5_000n} assumption="if CHIPDOG holds its pair" />,
    );
    expect(screen.getByTestId("whatif-outcome")).toHaveTextContent("if CHIPDOG holds its pair");
  });

  it("shows a perp order's P&L and liquidation under a shock", () => {
    const position = {
      side: "long" as const,
      collateralCents: 10_000n,
      leverage: 10,
      entryPrice: usd(100n),
      openedAt: new Date(0),
    };
    render(<PerpWhatIf position={position} mark={usd(100n)} symbol="BTC" />);
    press(/BTC/, "PageUp");
    expect(screen.getByTestId("whatif-outcome")).toHaveTextContent(
      /^At \$110\.00, P&L \+\$100\.00, /,
    );
    press(/BTC/, "Home");
    expect(screen.getByTestId("whatif-outcome")).toHaveTextContent(
      "Liquidated at $70.00: the margin is lost.",
    );
  });

  it("shows how far a basket drifts when its Stock Tokens move", () => {
    const weights = [
      { assetId: "rh:NVDA", bps: 5_000 },
      { assetId: "rh:ETH", bps: 5_000 },
    ];
    render(<BasketWhatIf weights={weights} legCents={[5_000n, 5_000n]} />);
    press(/Stock Tokens/, "Home");
    expect(screen.getByTestId("whatif-outcome")).toHaveTextContent(
      "Drifts up to 8.82% from target, enough to suggest a rebalance.",
    );
  });
});
