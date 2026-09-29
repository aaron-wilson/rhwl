import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { testProviders } from "../../test/providers";
import { guardrailsStore } from "./guardrails-store";
import { GuardrailsPage } from "./GuardrailsPage";

function mount() {
  const router = createMemoryRouter([{ path: "/guardrails", Component: GuardrailsPage }], {
    initialEntries: ["/guardrails"],
  });
  render(
    <ProvidersContext.Provider value={testProviders()}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
}

describe("GuardrailsPage", () => {
  it("starts with every rule off", () => {
    mount();
    screen.getAllByRole("switch").forEach((s) => {
      expect(s).toHaveAttribute("aria-checked", "false");
    });
    expect(screen.queryByTestId("guardrails-status")).not.toBeInTheDocument();
  });

  it("switches a rule on at its default, changes it, and off again", async () => {
    mount();
    await userEvent.click(screen.getByRole("switch", { name: /Weekly meme budget/ }));
    expect(guardrailsStore.get().memeBudgetCents).toBe(25_000n);
    expect(screen.getByTestId("guardrails-status")).toHaveTextContent("$0.00 of $250.00");
    await userEvent.click(screen.getByRole("radio", { name: "$100" }));
    expect(guardrailsStore.get().memeBudgetCents).toBe(10_000n);
    await userEvent.click(screen.getByRole("switch", { name: /Weekly meme budget/ }));
    expect(guardrailsStore.get()).toEqual({});
  });

  it("sets leverage, sleep-on-it and cool-off", async () => {
    mount();
    await userEvent.click(screen.getByRole("switch", { name: /Leverage cap/ }));
    await userEvent.click(screen.getByRole("radio", { name: "2x" }));
    await userEvent.click(screen.getByRole("switch", { name: /Sleep on it/ }));
    await userEvent.click(screen.getByRole("radio", { name: "30 min" }));
    await userEvent.click(screen.getByRole("switch", { name: /Cool-off/ }));
    await userEvent.click(screen.getByRole("radio", { name: "4 hours" }));
    expect(guardrailsStore.get()).toEqual({
      maxLeverage: 2,
      sleepOnIt: { thresholdCents: 100_000n, delayMs: 1_800_000 },
      coolOff: { losses: 3, ms: 14_400_000 },
    });
  });
});
