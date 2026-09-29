import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../../adapters/demo/storage";
import { testProviders } from "../../test/providers";
import { App } from "../../app/App";
import { hydrate, PREFS_KEY } from "../../app/persistence";
import { hapticsOnStore, hideSmallStore } from "../../app/preferences";
import { createSession } from "../../app/session";
import { displayCurrencyStore } from "../../domain/money/display";
import { formatFiat, formatPrice } from "../../domain/money/format";
import { txEvents } from "../transactions";
import { amount } from "../../domain/money/amount";

describe("display currency", () => {
  it("converts at the fixed demo rate and keeps USD by default", () => {
    expect(formatFiat(10_000n)).toBe("$100.00");
    displayCurrencyStore.set("EUR");
    expect(formatFiat(10_000n)).toBe("€92.00");
    expect(formatPrice(amount(18_684_000_000n, 8))).toBe("€171.89");
    displayCurrencyStore.set("GBP");
    expect(formatFiat(-10_000n, "always")).toBe("−£79.00");
  });
});

describe("preference persistence", () => {
  it("restores currency, haptics and small-balance hiding from their own key", () => {
    const storage = createMemoryStorage();
    storage.set(
      PREFS_KEY,
      JSON.stringify({ version: 1, currency: "GBP", haptics: false, hideSmall: true }),
    );
    const stop = hydrate(storage);
    expect([displayCurrencyStore.get(), hapticsOnStore.get(), hideSmallStore.get()]).toEqual([
      "GBP",
      false,
      true,
    ]);
    displayCurrencyStore.set("EUR");
    expect(JSON.parse(storage.get(PREFS_KEY) ?? "{}")).toMatchObject({ currency: "EUR" });
    stop();
  });

  it("ignores a malformed preference record", () => {
    const storage = createMemoryStorage();
    storage.set(PREFS_KEY, JSON.stringify({ version: 1, currency: "JPY" }));
    const stop = hydrate(storage);
    expect(displayCurrencyStore.get()).toBe("USD");
    stop();
  });
});

describe("haptics preference", () => {
  it("stops the buzz when switched off", () => {
    const providers = testProviders();
    createSession(() => providers);
    const request = {
      kind: "send" as const,
      summary: { verb: "Sent" },
      deltas: [],
      fee: { assetId: "rh:ETH", quantity: amount(0n, 18) },
    };
    txEvents.publish({ type: "signed", request });
    hapticsOnStore.set(false);
    txEvents.publish({ type: "signed", request });
    expect(providers.haptics.played).toEqual(["light"]);
  });
});

describe("Settings display section", () => {
  it("switches the whole app to euros", async () => {
    window.history.replaceState(null, "", "/settings");
    render(<App session={createSession(testProviders)} />);
    await userEvent.click(await screen.findByText("EUR €"));
    expect(displayCurrencyStore.get()).toBe("EUR");
    window.history.replaceState(null, "", "/");
  });
});
