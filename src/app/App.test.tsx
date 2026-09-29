import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { testProviders } from "../test/providers";
import { App } from "./App";
import { createSession } from "./session";

describe("App shell", () => {
  // Home's cards are lazy; load them up front, so none is still importing when a test ends.
  beforeAll(async () => {
    await Promise.all([
      import("../features/earnings/EarningsCard"),
      import("../features/guardrails/GuardrailsStatus"),
      import("../features/pair-lens/PairLensSummary"),
    ]);
  });

  it("renders Home inside the shell with primary navigation", async () => {
    render(<App session={createSession(testProviders)} />);
    expect(await screen.findByRole("heading", { name: "Portfolio" })).toBeInTheDocument();
    const navs = screen.getAllByRole("navigation", { name: "Primary" });
    expect(navs.length).toBeGreaterThan(0);
    for (const label of ["Home", "Trade", "Launch", "Activity", "Settings"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
  });

  it("masks every amount when balances are hidden and restores them", async () => {
    render(<App session={createSession(testProviders)} />);
    const total = await screen.findByRole("button", { name: /Hide balances/ });
    const shown = screen.getByTestId("portfolio-total").textContent;
    expect(shown).toMatch(/^\$[\d,]+\.\d{2}$/);
    expect(total).toHaveAccessibleName(`${shown} Hide balances`);
    expect(total).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(total);
    expect(screen.queryByText(shown)).toBeNull();
    expect(total).toHaveAttribute("aria-pressed", "true");
    expect(total).toHaveAccessibleName("Hidden amount Hide balances");
    expect(screen.getAllByText("Hidden amount").length).toBeGreaterThan(3);
    await userEvent.click(total);
    expect(screen.getByTestId("portfolio-total")).toHaveTextContent(shown);
  });
});
