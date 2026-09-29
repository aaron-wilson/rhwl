import { useMemo } from "react";
import { useProviders } from "../../app/providers-context";
import type { StockToken } from "../../data/types";
import { type CalendarEntry, type Exposure } from "../../domain/earnings/earnings";
import { calendarFor, heldMemes } from "../../domain/earnings/held";
import { valueInCents } from "../../domain/money/amount";
import { notionalCents } from "../../domain/perps/position";
import { usePositions } from "../perps";
import { useHoldings } from "../transactions";

/** Upcoming reports that touch what the account holds. */
export function useEarningsCalendar(account: string, now: Date): readonly CalendarEntry[] {
  const holdings = useHoldings(account);
  return useMemo(() => calendarFor(holdings, now), [holdings, now]);
}

/** Everything the account has riding on one stock right now, in cents. */
export function useExposure(account: string, stock: StockToken, now: Date): Exposure {
  const { market } = useProviders();
  const holdings = useHoldings(account);
  const positions = usePositions();
  return useMemo(() => {
    const value = (assetId: string) => {
      const held = holdings.find((h) => h.assetId === assetId)?.quantity;
      return held === undefined ? 0n : valueInCents(held, market.price(assetId, now));
    };
    return {
      tokenCents: value(stock.id),
      memes: heldMemes(holdings)
        .filter((m) => m.quotes.includes(stock.id))
        .map((m) => ({ symbol: m.symbol, valueCents: value(m.id) })),
      perpCents: positions
        .filter((p) => p.account === account && p.market.assetId === stock.id)
        .reduce((sum, p) => sum + (p.side === "long" ? 1n : -1n) * notionalCents(p), 0n),
    };
  }, [holdings, positions, market, stock, account, now]);
}
