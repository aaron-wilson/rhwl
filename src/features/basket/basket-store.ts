import { assets } from "../../data/assets";
import type { Weight } from "../../domain/basket/basket";
import { createStore, useStore } from "../../lib/store";

export interface Basket {
  readonly name: string;
  readonly weights: readonly Weight[];
  /** Whether the basket has been bought, so drift is worth watching. */
  readonly bought: boolean;
}

/** A starting basket to edit: two Stock Tokens, ETH and a stock-paired meme. */
export const starterBasket: Basket = {
  name: "Tendies Index",
  weights: [
    { assetId: "rh:NVDA", bps: 4000 },
    { assetId: "rh:AAPL", bps: 2000 },
    { assetId: "rh:ETH", bps: 2500 },
    { assetId: "rh:CHIPDOG", bps: 1500 },
  ],
  bought: false,
};

/** The user's basket. Session state: Reset demo restores the starter. */
export const basketStore = createStore<Basket>(starterBasket);
export const useBasket = () => useStore(basketStore);

export function setWeights(weights: readonly Weight[]): void {
  basketStore.set((basket) => ({ ...basket, weights }));
}

export function markBought(): void {
  basketStore.set((basket) => ({ ...basket, bought: true }));
}

/** What a basket can hold: anything on Robinhood Chain except the cash it is bought with. */
export const basketable = assets.filter((a) => a.chain === "robinhood" && a.kind !== "stable");
