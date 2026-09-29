import type { Amount } from "../domain/money/amount";

export interface PricePoint {
  readonly at: Date;
  /** US dollars per whole token, 8 decimals. */
  readonly price: Amount;
}

/** Prices for every asset in the catalog, at any instant. */
export interface Market {
  price(assetId: string, at: Date): Amount;
  /** `points` evenly spaced prices from `from` to `to`, inclusive. */
  series(assetId: string, from: Date, to: Date, points: number): readonly PricePoint[];
  /**
   * The price change is measured from: the last regular-session close for
   * stock tokens, 24 hours earlier for everything else.
   */
  reference(assetId: string, at: Date): PricePoint;
}
