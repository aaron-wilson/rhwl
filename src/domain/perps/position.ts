import { amount, type Amount } from "../money/amount";

export type PerpSide = "long" | "short";

/** Equity must stay above this share of the position's size, or it is liquidated. */
export const MAINTENANCE_BPS = 50n;
/** Funding is paid every 8 hours. */
export const FUNDING_PERIOD_HOURS = 8;

export interface Position {
  readonly side: PerpSide;
  /** Margin posted, in cents of USDG. */
  readonly collateralCents: bigint;
  readonly leverage: number;
  /** US dollars per unit, 8 decimals. */
  readonly entryPrice: Amount;
  readonly openedAt: Date;
}

/** Size in dollars: collateral times leverage. */
export const notionalCents = (p: Position): bigint => p.collateralCents * BigInt(p.leverage);

const direction = (side: PerpSide): bigint => (side === "long" ? 1n : -1n);

/** Profit or loss at `mark`, in cents, before funding. Rounded toward zero. */
export function pnlCents(p: Position, mark: Amount): bigint {
  return (
    (notionalCents(p) * (mark.base - p.entryPrice.base) * direction(p.side)) / p.entryPrice.base
  );
}

/**
 * The mark price at which equity falls to the maintenance margin, using the
 * size at entry: long → entry × (1 − 1/leverage + m), short → entry × (1 + 1/leverage − m).
 */
export function liquidationPrice(p: Pick<Position, "side" | "leverage" | "entryPrice">): Amount {
  const entry = p.entryPrice.base;
  const lev = BigInt(p.leverage);
  // In basis points of entry: 10,000/lev − maintenance.
  const buffer = 10_000n / lev - MAINTENANCE_BPS;
  const bps = p.side === "long" ? 10_000n - buffer : 10_000n + buffer;
  return amount((entry * bps) / 10_000n, p.entryPrice.decimals);
}

/** True once the mark has reached the liquidation price. */
export function isLiquidated(p: Position, mark: Amount): boolean {
  const liq = liquidationPrice(p).base;
  return p.side === "long" ? mark.base <= liq : mark.base >= liq;
}

/**
 * Funding owed since opening, in cents: longs pay a positive rate, shorts
 * receive it. `rateCentiBps` is per 8-hour period, in hundredths of a basis point
 * (so 100 = 0.01%). Accrues continuously.
 */
export function fundingCents(p: Position, rateCentiBps: number, now: Date): bigint {
  const ms = BigInt(Math.max(0, now.getTime() - p.openedAt.getTime()));
  const period = BigInt(FUNDING_PERIOD_HOURS * 3_600_000);
  return (notionalCents(p) * BigInt(rateCentiBps) * ms * direction(p.side)) / (1_000_000n * period);
}

/** Equity: collateral plus profit, less funding paid. Never below zero for the payout. */
export function equityCents(p: Position, mark: Amount, funding: bigint): bigint {
  return p.collateralCents + pnlCents(p, mark) - funding;
}

/** Take-profit and stop-loss must sit on the correct sides of the entry. */
export function checkTriggers(
  side: PerpSide,
  entry: Amount,
  takeProfit: Amount | undefined,
  stopLoss: Amount | undefined,
): string | undefined {
  const above = (x: Amount) => x.base > entry.base;
  if (takeProfit !== undefined && above(takeProfit) !== (side === "long")) {
    return side === "long"
      ? "Take profit must be above the entry"
      : "Take profit must be below the entry";
  }
  if (stopLoss !== undefined && above(stopLoss) === (side === "long")) {
    return side === "long"
      ? "Stop loss must be below the entry"
      : "Stop loss must be above the entry";
  }
  return undefined;
}

/** Whether a take-profit or stop-loss has been hit at `mark`. */
export function triggerHit(
  side: PerpSide,
  mark: Amount,
  takeProfit: Amount | undefined,
  stopLoss: Amount | undefined,
): "take-profit" | "stop-loss" | undefined {
  const up = (x: Amount) => mark.base >= x.base;
  const down = (x: Amount) => mark.base <= x.base;
  if (takeProfit !== undefined && (side === "long" ? up(takeProfit) : down(takeProfit)))
    return "take-profit";
  if (stopLoss !== undefined && (side === "long" ? down(stopLoss) : up(stopLoss)))
    return "stop-loss";
  return undefined;
}

export { centsToUsdg } from "../money/amount";
