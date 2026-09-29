import { createStore } from "../../lib/store";
import { divRound, type Amount } from "./amount";

export type Currency = "USD" | "EUR" | "GBP";

/**
 * Fixed demo exchange rates from USD, in basis points. Balances and prices
 * stay in USD everywhere; only what is displayed is converted.
 */
export const usdRateBps: Readonly<Record<Currency, bigint>> = {
  USD: 10_000n,
  EUR: 9_200n,
  GBP: 7_900n,
};

/** The currency money is shown in. A preference: it survives Reset demo. */
export const displayCurrencyStore = createStore<Currency>("USD", "preference");

/** USD cents in the display currency's minor units. */
export function toDisplayCents(usdCents: bigint): bigint {
  const rate = usdRateBps[displayCurrencyStore.get()];
  return rate === 10_000n ? usdCents : divRound(usdCents * rate, 10_000n);
}

/** A USD unit price in the display currency, at the same precision. */
export function toDisplayPrice(usdPrice: Amount): Amount {
  const rate = usdRateBps[displayCurrencyStore.get()];
  return rate === 10_000n
    ? usdPrice
    : { ...usdPrice, base: divRound(usdPrice.base * rate, 10_000n) };
}
