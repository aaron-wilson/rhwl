import { amount, divRound, valueInCents, type Amount } from "../money/amount";
import type { HistoryChange } from "./cost-basis";

/** Units bought together, and what is left of them. */
export interface Lot {
  readonly acquiredAt: Date;
  /** Units still held from this lot. */
  readonly quantity: Amount;
  /** What the units still held cost, in cents. */
  readonly costCents: bigint;
}

/** Part of a lot sold: FIFO matches each sale to the oldest lots first. */
export interface Disposal {
  readonly acquiredAt: Date;
  readonly soldAt: Date;
  readonly quantity: Amount;
  readonly costCents: bigint;
  readonly proceedsCents: bigint;
}

export interface LotBook {
  readonly open: readonly Lot[];
  readonly closed: readonly Disposal[];
}

/**
 * First in, first out. Every arrival opens a lot at the price then; every
 * departure is sold at the price then, taken from the oldest lots. Cost and
 * proceeds split in proportion to units, rounded half-even.
 */
export function fifoLots(
  changes: readonly HistoryChange[],
  priceAt: (at: Date) => Amount,
): LotBook {
  const open: { acquiredAt: Date; units: bigint; costCents: bigint; decimals: number }[] = [];
  const closed: Disposal[] = [];
  for (const change of changes) {
    const units = change.quantity.base;
    if (units > 0n) {
      open.push({
        acquiredAt: change.at,
        units,
        costCents: valueInCents(change.quantity, priceAt(change.at)),
        decimals: change.quantity.decimals,
      });
      continue;
    }
    let left = -units;
    const saleValue = valueInCents(amount(left, change.quantity.decimals), priceAt(change.at));
    const saleUnits = left;
    while (left > 0n && open.length > 0) {
      const lot = open[0];
      if (lot === undefined) break;
      const take = left < lot.units ? left : lot.units;
      const cost = take === lot.units ? lot.costCents : divRound(lot.costCents * take, lot.units);
      closed.push({
        acquiredAt: lot.acquiredAt,
        soldAt: change.at,
        quantity: amount(take, lot.decimals),
        costCents: cost,
        proceedsCents: divRound(saleValue * take, saleUnits),
      });
      lot.units -= take;
      lot.costCents -= cost;
      left -= take;
      if (lot.units === 0n) open.shift();
    }
  }
  return {
    open: open.map((l) => ({
      acquiredAt: l.acquiredAt,
      quantity: amount(l.units, l.decimals),
      costCents: l.costCents,
    })),
    closed,
  };
}

export const realizedCents = (book: LotBook): bigint =>
  book.closed.reduce((sum, d) => sum + d.proceedsCents - d.costCents, 0n);

export const openCostCents = (book: LotBook): bigint =>
  book.open.reduce((sum, l) => sum + l.costCents, 0n);
