import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { amount, valueInCents } from "../../domain/money/amount";
import { testProviders } from "../../test/providers";
import { startInbox } from "../inbox/watch";
import { inboxStore } from "../inbox/inbox-store";
import { addAlert, alertsStore, rearmAlert } from "./alerts-store";
import { AlertsCard } from "./AlertsCard";

let stop: () => void = () => undefined;
afterEach(() => {
  stop();
});

const STEP = 5_000;

describe("price alerts on the app clock", () => {
  it("fires once when NVDA crosses a threshold a cent above it, then waits to be re-armed", () => {
    const p = testProviders();
    const cents = () => valueInCents(amount(1n, 0), p.market.price("rh:NVDA", p.clock.now()));
    const start = cents();
    expect(
      addAlert({ assetId: "rh:NVDA", direction: "above", thresholdCents: start + 1n }, start),
    ).toBeUndefined();
    stop = startInbox(p);

    let steps = 0;
    while (inboxStore.get().length === 0 && steps < 20_000) {
      p.clock.advance(STEP);
      steps += 1;
    }
    expect(inboxStore.get().map((i) => i.kind)).toEqual(["alert"]);
    expect(inboxStore.get()[0]?.title).toMatch(/^NVDA rose above \$/);
    expect(alertsStore.get()[0]).toMatchObject({ armed: false });

    p.clock.advance(STEP * 200);
    expect(inboxStore.get()).toHaveLength(1);

    const id = alertsStore.get()[0]?.id ?? 0;
    expect(rearmAlert(id, start + 2n)).toBe("already-past");
    expect(rearmAlert(id, start)).toBeUndefined();
    expect(alertsStore.get()[0]?.armed).toBe(true);
  });
});

describe("AlertsCard", () => {
  it("sets an alert and refuses one the price has already passed", async () => {
    const p = testProviders();
    render(
      <ProvidersContext.Provider value={p}>
        <AlertsCard assetId="rh:NVDA" symbol="NVDA" />
      </ProvidersContext.Provider>,
    );
    const input = screen.getByLabelText(/Alert price in dollars/);
    await userEvent.type(input, "1");
    await userEvent.click(screen.getByRole("button", { name: "Set alert" }));
    expect(screen.getByRole("alert")).toHaveTextContent("NVDA is already above $1.00");
    await userEvent.clear(input);
    await userEvent.type(input, "100000");
    await userEvent.click(screen.getByRole("button", { name: "Set alert" }));
    expect(screen.getByRole("list", { name: "NVDA alerts" })).toHaveTextContent(
      "Above $100,000.00Armed",
    );
  });
});
