import { OPENING_AT } from "../../data/world";
import { assetById } from "../../data/assets";
import type { MemeToken } from "../../data/types";
import type { Amount } from "../../domain/money/amount";
import { basketIndex } from "../../domain/pair-lens";
import type { Market } from "../../ports/market";

export interface QuoteReference {
  /** "NVDA", or "the NVDA/AAPL/MSFT basket". */
  readonly label: string;
  /** The quote's price at a time, in dollars with 8 decimals. A basket is an index at 100. */
  readonly priceAt: (at: Date) => Amount;
}

/** What a meme is quoted against, as one price over time. */
export function quoteReference(market: Market, meme: MemeToken): QuoteReference {
  const symbols = meme.quotes.map((id) => assetById(id).symbol);
  const [only] = meme.quotes;
  if (meme.quotes.length === 1 && only !== undefined) {
    return { label: symbols.join(""), priceAt: (at) => market.price(only, at) };
  }
  const base = meme.quotes.map((id) => market.price(id, OPENING_AT));
  return {
    label: `the ${symbols.join("/")} basket`,
    priceAt: (at) =>
      basketIndex(
        meme.quotes.map((id) => market.price(id, at)),
        base,
      ),
  };
}
