import { useMemo } from "react";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import type { Asset } from "../../data/types";
import { changeBps } from "../../domain/market/change";
import { valueInCents, type Amount } from "../../domain/money/amount";
import { changeBetween, sumSeries, type Change } from "../../domain/portfolio/portfolio";
import type { Market } from "../../ports/market";
import { useActiveAccount } from "../accounts";
import { useHoldings } from "../transactions";
import { rangeWindow, type RangeKey } from "./ranges";

export interface HoldingRow {
  readonly asset: Asset;
  readonly quantity: Amount;
  readonly valueCents: bigint;
  /** Change since the reference price: last close for stocks, 24 hours for the rest. */
  readonly changeBps: bigint;
  /** A day of prices for the row's sparkline; plotting only. */
  readonly spark: readonly number[];
}

export interface Portfolio {
  readonly times: readonly Date[];
  /** Portfolio value in cents at each time, for today's holdings. */
  readonly totals: readonly bigint[];
  readonly total: bigint;
  readonly change: Change;
  readonly rows: readonly HoldingRow[];
}

function rowFor(market: Market, assetId: string, quantity: Amount, now: Date): HoldingRow {
  const price = market.price(assetId, now);
  const day = rangeWindow("1D", now);
  return {
    asset: assetById(assetId),
    quantity,
    valueCents: valueInCents(quantity, price),
    changeBps: changeBps(price, market.reference(assetId, now).price),
    spark: market.series(assetId, day.from, day.to, 48).map((p) => Number(p.price.base)),
  };
}

/**
 * The active account's portfolio over a range, from live holdings (optimistic
 * included) and the market. The chart values today's holdings across the range.
 */
export function usePortfolio(range: RangeKey): Portfolio {
  const { market } = useProviders();
  const account = useActiveAccount();
  const holdings = useHoldings(account);
  const now = useNow();

  // Rows do not depend on the range, so switching ranges leaves them alone.
  const rows = useMemo(
    () =>
      holdings
        .map((h) => rowFor(market, h.assetId, h.quantity, now))
        .sort((a, b) => (a.valueCents === b.valueCents ? 0 : a.valueCents > b.valueCents ? -1 : 1)),
    [holdings, market, now],
  );
  return useMemo(() => {
    const { from, to, points } = rangeWindow(range, now);
    const perAsset = holdings.map((h) =>
      market.series(h.assetId, from, to, points).map((p) => valueInCents(h.quantity, p.price)),
    );
    const totals = sumSeries(perAsset);
    const times = market
      .series(holdings[0]?.assetId ?? "rh:ETH", from, to, points)
      .map((p) => p.at);
    const first = totals[0] ?? 0n;
    const total = totals.at(-1) ?? 0n;
    return { times, totals, total, change: changeBetween(first, total), rows };
  }, [holdings, market, now, range, rows]);
}
