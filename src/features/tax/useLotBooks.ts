import { useMemo } from "react";
import { useProviders } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { OPENING_AT } from "../../data/world";
import { amount, valueInCents } from "../../domain/money/amount";
import { positionChanges } from "../../domain/portfolio/cost-basis";
import { fifoLots, openCostCents, realizedCents, type LotBook } from "../../domain/portfolio/lots";
import { useActivity } from "../activity";
import { historyOf } from "../asset";
import { useHoldings } from "../transactions";

export interface AssetLots {
  readonly assetId: string;
  readonly symbol: string;
  readonly book: LotBook;
  readonly realizedCents: bigint;
  readonly unrealizedCents: bigint;
}

/** FIFO lots for every non-cash asset the account holds or has traded, from the same history as cost basis. */
export function useLotBooks(account: string, now: Date): readonly AssetLots[] {
  const { market } = useProviders();
  const holdings = useHoldings(account);
  const rows = useActivity(account);
  return useMemo(() => {
    const ids = new Set([
      ...holdings.map((h) => h.assetId),
      ...rows.flatMap((r) => r.effects.map((e) => e.assetId)),
    ]);
    return [...ids]
      .map((id) => assetById(id))
      .filter((a) => a.kind !== "stable")
      .map((asset) => {
        const held =
          holdings.find((h) => h.assetId === asset.id)?.quantity ?? amount(0n, asset.decimals);
        const priceAt = (at: Date) => market.price(asset.id, at);
        const book = fifoLots(
          positionChanges(held, historyOf(rows, asset.id), OPENING_AT),
          priceAt,
        );
        return {
          assetId: asset.id,
          symbol: asset.symbol,
          book,
          realizedCents: realizedCents(book),
          unrealizedCents: valueInCents(held, priceAt(now)) - openCostCents(book),
        };
      })
      .filter((a) => a.book.open.length > 0 || a.book.closed.length > 0)
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [holdings, rows, market, now]);
}
