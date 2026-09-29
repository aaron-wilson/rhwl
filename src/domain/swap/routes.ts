import type { Asset } from "../../data/types";
import { amount, pow10, type Amount } from "../money/amount";

/** Dollars in 8 decimals, the same scale as prices. */
const USD = 8;
const usd = (dollars: number): bigint => BigInt(dollars) * pow10(USD);

/** Pool depth by asset kind, in dollars. A pool is as deep as its shallower side. */
const depth: Record<Asset["kind"], bigint> = {
  stable: usd(80_000_000),
  crypto: usd(60_000_000),
  stock: usd(25_000_000),
  meme: usd(600_000),
};

/** How much a price may move before a swap reverts, by default, in basis points. */
const autoSlippage: Record<Asset["kind"], number> = {
  stable: 10,
  crypto: 50,
  stock: 50,
  meme: 300,
};

export interface Venue {
  readonly id: string;
  readonly name: string;
  readonly feeBps: number;
  /** Share of the reference pool depth this route can reach. */
  readonly depthPercent: number;
  readonly hops: number;
}

/** Fictional venues. Splitting across both reaches more liquidity for a slightly higher fee. */
export const venues: readonly Venue[] = [
  { id: "hood", name: "Hood Swap", feeBps: 30, depthPercent: 100, hops: 1 },
  { id: "pairwise", name: "Pairwise", feeBps: 25, depthPercent: 45, hops: 1 },
  { id: "split", name: "Split: Hood Swap + Pairwise", feeBps: 29, depthPercent: 145, hops: 2 },
];

export interface Route {
  readonly venue: Venue;
  readonly out: Amount;
  /** Loss to pool depth, before fees, in basis points. */
  readonly impactBps: bigint;
}

export interface SwapSide {
  readonly asset: Asset;
  /** US dollars per whole token, 8 decimals. */
  readonly price: Amount;
}

/**
 * Quotes every venue for selling `amountIn` of `from` for `to`, best first.
 * Each venue is a constant-product pool whose two sides are worth its depth:
 * after the fee, an input worth x against depth R returns R·x / (R + x).
 */
export function quoteRoutes(from: SwapSide, to: SwapSide, amountIn: Amount): readonly Route[] {
  const valueIn = (amountIn.base * from.price.base) / pow10(amountIn.decimals);
  const reference =
    depth[from.asset.kind] < depth[to.asset.kind] ? depth[from.asset.kind] : depth[to.asset.kind];
  return venues
    .map((venue) => {
      const pool = (reference * BigInt(venue.depthPercent)) / 100n;
      const afterFee = (valueIn * BigInt(10_000 - venue.feeBps)) / 10_000n;
      const valueOut = afterFee === 0n ? 0n : (pool * afterFee) / (pool + afterFee);
      const impactBps = afterFee === 0n ? 0n : ((afterFee - valueOut) * 10_000n) / afterFee;
      const out = amount((valueOut * pow10(to.asset.decimals)) / to.price.base, to.asset.decimals);
      return { venue, out, impactBps };
    })
    .sort((a, b) => (a.out.base === b.out.base ? 0 : a.out.base > b.out.base ? -1 : 1));
}

/** The default tolerance for a pair: the looser of the two sides. */
export function defaultSlippageBps(from: Asset, to: Asset): number {
  return Math.max(autoSlippage[from.kind], autoSlippage[to.kind]);
}

/** The least the swap may return before it reverts. Rounded down. */
export function minimumReceived(out: Amount, slippageBps: number): Amount {
  return amount((out.base * BigInt(10_000 - slippageBps)) / 10_000n, out.decimals);
}

/** Above this, the review warns that the trade moves the price a lot. */
export const HIGH_IMPACT_BPS = 500n;

/** Custom slippage must be a positive percentage no higher than 50%. */
export function parseSlippage(text: string): number | undefined {
  const trimmed = text.trim().replace(/%$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return undefined;
  const bps = Math.round(Number(trimmed) * 100);
  return bps > 0 && bps <= 5_000 ? bps : undefined;
}
