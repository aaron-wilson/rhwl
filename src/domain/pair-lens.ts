import { amount, divRound, type Amount } from "./money/amount";
import { SHADOW_SCALE, type Basis } from "./portfolio/cost-basis";

/**
 * A stock-paired meme's profit or loss split in two, in cents:
 * - beta: what the same dollars would have made in the quote asset
 *   (NVDA for a dog quoted in NVDA, or the basket for a multipool quote);
 * - alpha: the rest, the meme's own move against its quote.
 * beta + alpha = total exactly: all rounding is left in alpha.
 */
export interface PairLens {
  readonly totalCents: bigint;
  readonly betaCents: bigint;
  readonly alphaCents: bigint;
  /** The quote's move since the cost-weighted entry, in basis points. */
  readonly quoteBps: bigint;
}

/** Undefined when there is nothing to decompose: no cost, or no shadow position. */
export function pairLens(basis: Basis, valueCents: bigint, quoteNow: Amount): PairLens | undefined {
  if (basis.costCents <= 0n || basis.shadow <= 0n) return undefined;
  const shadowNowCents = divRound(basis.shadow * quoteNow.base, SHADOW_SCALE);
  const totalCents = valueCents - basis.costCents;
  const betaCents = shadowNowCents - basis.costCents;
  return {
    totalCents,
    betaCents,
    alphaCents: totalCents - betaCents,
    quoteBps: divRound(betaCents * 10_000n, basis.costCents),
  };
}

/**
 * An equal-weight basket index in dollars with 8 decimals: the mean of each
 * member's price relative to its price at `base`, scaled to 100. A basket
 * quote moves as the average of its members' moves.
 */
export function basketIndex(prices: readonly Amount[], basePrices: readonly Amount[]): Amount {
  if (prices.length === 0 || prices.length !== basePrices.length) {
    throw new RangeError("A basket needs one base price per member");
  }
  const hundred = 100n * 10n ** 8n;
  const sum = prices.reduce((total, price, i) => {
    const base = basePrices[i]?.base ?? 0n;
    return base === 0n ? total : total + divRound(price.base * hundred, base);
  }, 0n);
  return amount(divRound(sum, BigInt(prices.length)), 8);
}
