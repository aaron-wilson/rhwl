import { useMemo } from "react";
import { useProviders } from "../../app/providers-context";
import type { Asset } from "../../data/types";
import { changeBps } from "../../domain/market/change";
import type { Amount } from "../../domain/money/amount";
import type { PricePoint } from "../../ports/market";
import { rangeWindow, type RangeKey } from "../home";

export interface PriceChart {
  readonly points: readonly PricePoint[];
  /** Plotting values in dollars; never used for money. */
  readonly values: readonly number[];
  readonly price: Amount;
  /** Where the range's change is measured from: last close or 24 hours ago for 1D, else the range start. */
  readonly from: Amount;
  readonly changeBps: bigint;
  /** Today's range, for key stats. */
  readonly dayLow: Amount;
  readonly dayHigh: Amount;
}

const toNumber = (price: Amount) => Number(price.base) / 10 ** price.decimals;
const lower = (a: Amount, b: Amount) => (a.base <= b.base ? a : b);
const higher = (a: Amount, b: Amount) => (a.base >= b.base ? a : b);

/** One asset's price over a range, plus the change the header shows. */
export function usePriceChart(asset: Asset, range: RangeKey, now: Date): PriceChart {
  const { market } = useProviders();
  return useMemo(() => {
    const { from, to, points: count } = rangeWindow(range, now);
    const points = market.series(asset.id, from, to, count);
    const day = range === "1D" ? points : market.series(asset.id, ...dayBounds(now), 145);
    const price = market.price(asset.id, now);
    const start =
      range === "1D" ? market.reference(asset.id, now).price : (points[0]?.price ?? price);
    const prices = day.map((p) => p.price);
    return {
      points,
      values: points.map((p) => toNumber(p.price)),
      price,
      from: start,
      changeBps: changeBps(price, start),
      dayLow: prices.reduce(lower, price),
      dayHigh: prices.reduce(higher, price),
    };
  }, [asset, market, now, range]);
}

function dayBounds(now: Date): [Date, Date] {
  const { from, to } = rangeWindow("1D", now);
  return [from, to];
}
