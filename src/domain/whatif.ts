import { currentBps, type Weight } from "./basket/basket";
import { amount, divRound, type Amount } from "./money/amount";
import { isLiquidated, liquidationPrice, pnlCents, type Position } from "./perps/position";

/** The slider's range: a price shock of −30% to +30%, in basis points. */
export const SHOCK_MIN_BPS = -3_000;
export const SHOCK_MAX_BPS = 3_000;

/** A price moved by `bps`: 1,000 is +10%. */
export function shockPrice(price: Amount, bps: number): Amount {
  return amount(divRound(price.base * BigInt(10_000 + bps), 10_000n), price.decimals);
}

/** A holding's value after the shock. A paired meme is assumed to hold its pair, so it moves with its quote. */
export function valueAtShock(valueCents: bigint, bps: number): bigint {
  return divRound(valueCents * BigInt(10_000 + bps), 10_000n);
}

export interface PerpOutcome {
  readonly mark: Amount;
  readonly pnlCents: bigint;
  readonly liquidated: boolean;
  /** How far the shocked mark still is from liquidation, in basis points of it; 0 once liquidated. */
  readonly bufferBps: bigint;
}

/** A perp position at a shocked mark, using the same liquidation rule the exchange applies. */
export function perpAtShock(position: Position, mark: Amount, bps: number): PerpOutcome {
  const shocked = shockPrice(mark, bps);
  const liquidated = isLiquidated(position, shocked);
  const liq = liquidationPrice(position).base;
  const gap = position.side === "long" ? shocked.base - liq : liq - shocked.base;
  return {
    mark: shocked,
    pnlCents: liquidated ? -position.collateralCents : pnlCents(position, shocked),
    liquidated,
    bufferBps: liquidated || shocked.base === 0n ? 0n : divRound(gap * 10_000n, shocked.base),
  };
}

/**
 * A basket after shocking some members: their values move, the rest stay.
 * Returns each member's new share and the largest drift from target.
 */
export function basketAtShock(
  valuesCents: readonly bigint[],
  weights: readonly Weight[],
  shocked: readonly boolean[],
  bps: number,
): {
  readonly valuesCents: readonly bigint[];
  readonly sharesBps: readonly number[];
  readonly driftBps: number;
} {
  const moved = valuesCents.map((v, i) => (shocked[i] === true ? valueAtShock(v, bps) : v));
  const shares = currentBps(moved);
  const driftBps = weights.reduce(
    (max, w, i) => Math.max(max, Math.abs((shares[i] ?? 0) - w.bps)),
    0,
  );
  return { valuesCents: moved, sharesBps: shares, driftBps };
}
