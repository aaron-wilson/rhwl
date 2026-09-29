import { add, amount, divRound, pow10, valueInCents, type Amount } from "../money/amount";
import { changeBetween, type Change } from "./portfolio";

/** One change to a position, oldest first. `valueCents` is what the change was worth when it happened. */
export interface PositionEvent {
  readonly quantity: Amount;
  readonly valueCents: bigint;
  /** For arrivals: shadow units the same dollars would have bought of a reference asset. */
  readonly shadow?: bigint;
}

export interface Basis {
  readonly quantity: Amount;
  /** What the units still held cost, in cents. */
  readonly costCents: bigint;
  /**
   * What the cost would hold of a reference asset had it been bought instead, in
   * shadow units (see SHADOW_SCALE). Zero when no reference was given.
   */
  readonly shadow: bigint;
}

/** Shadow units per cent, per dollar of reference price (prices carry 8 decimals). */
export const SHADOW_SCALE = 10n ** 18n;

/**
 * Average-cost basis. Arrivals add their value to the cost; departures remove
 * cost in proportion to the units that left, so the average cost per unit is
 * unchanged by a sale. Selling everything resets the cost to zero. The shadow
 * position follows the cost exactly.
 */
export function averageCost(events: readonly PositionEvent[], decimals: number): Basis {
  return events.reduce<Basis>(
    (basis, event) => {
      const held = basis.quantity.base;
      if (event.quantity.base >= 0n) {
        return {
          quantity: add(basis.quantity, event.quantity),
          costCents: basis.costCents + event.valueCents,
          shadow: basis.shadow + (event.shadow ?? 0n),
        };
      }
      const leaving = -event.quantity.base > held ? held : -event.quantity.base;
      const remaining = held - leaving;
      const keep = (total: bigint) =>
        remaining === 0n ? 0n : total - divRound(total * leaving, held);
      return {
        quantity: amount(remaining, decimals),
        costCents: keep(basis.costCents),
        shadow: keep(basis.shadow),
      };
    },
    { quantity: amount(0n, decimals), costCents: 0n, shadow: 0n },
  );
}

/** Unrealized profit or loss: current value against cost. */
export function unrealized(basis: Basis, valueCents: bigint): Change {
  return changeBetween(basis.costCents, valueCents);
}

/** A past change to the position, from the account's history. */
export interface HistoryChange {
  readonly at: Date;
  readonly quantity: Amount;
}

/**
 * The position's changes oldest first, starting with an opening balance for
 * whatever the history does not explain. Cost basis and tax lots both read it.
 */
export function positionChanges(
  held: Amount,
  history: readonly HistoryChange[],
  openedAt: Date,
): readonly HistoryChange[] {
  const explained = history.reduce((sum, change) => sum + change.quantity.base, 0n);
  const opening = held.base - explained;
  return [
    { at: openedAt, quantity: amount(opening > 0n ? opening : 0n, held.decimals) },
    ...[...history].sort((a, b) => a.at.getTime() - b.at.getTime()),
  ];
}

/**
 * Basis for what is held now. Whatever the history does not explain is treated
 * as an opening balance bought at `openedAt`; each change is valued at the
 * price when it happened. With `referenceAt`, each arrival's dollars also buy a
 * shadow position in that reference at its price then.
 */
export function basisFromHistory(
  held: Amount,
  history: readonly HistoryChange[],
  openedAt: Date,
  priceAt: (at: Date) => Amount,
  referenceAt?: (at: Date) => Amount,
): Basis {
  const changes = positionChanges(held, history, openedAt);
  return averageCost(
    changes.map((change) => {
      const valueCents = valueInCents(change.quantity, priceAt(change.at));
      const reference = referenceAt?.(change.at).base ?? 0n;
      const shadow =
        change.quantity.base > 0n && reference > 0n
          ? divRound(valueCents * SHADOW_SCALE, reference)
          : 0n;
      return { quantity: change.quantity, valueCents, shadow };
    }),
    held.decimals,
  );
}

/** Average price paid per whole unit, in dollars with 8 decimals; undefined when nothing is held. */
export function averagePrice(basis: Basis): Amount | undefined {
  if (basis.quantity.base === 0n) return undefined;
  return amount(
    divRound(basis.costCents * pow10(basis.quantity.decimals + 6), basis.quantity.base),
    8,
  );
}

/** Profit (positive) or loss locked in by selling `sold` units for `proceedsCents`, at average cost. */
export function realizedOnSale(basis: Basis, sold: Amount, proceedsCents: bigint): bigint {
  const held = basis.quantity.base;
  if (held === 0n) return proceedsCents;
  const units = sold.base > held ? held : sold.base;
  return proceedsCents - divRound(basis.costCents * units, held);
}
