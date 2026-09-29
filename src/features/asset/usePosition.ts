import { useMemo } from "react";
import { useProviders } from "../../app/providers-context";
import { OPENING_AT } from "../../data/world";
import { amount, valueInCents, type Amount } from "../../domain/money/amount";
import {
  averagePrice,
  basisFromHistory,
  unrealized,
  type Basis,
  type HistoryChange,
} from "../../domain/portfolio/cost-basis";
import { pairLens, type PairLens } from "../../domain/pair-lens";
import type { Change } from "../../domain/portfolio/portfolio";
import type { Asset } from "../../data/types";
import { useActivity, type ActivityRow } from "../activity";
import { quoteReference } from "../pair-lens";
import { useHoldings } from "../transactions";

export interface PositionView {
  readonly quantity: Amount;
  readonly valueCents: bigint;
  readonly basis: Basis;
  readonly averagePrice: Amount | undefined;
  readonly pnl: Change;
  /** The account's transactions that touched this asset, newest first. */
  readonly activity: readonly ActivityRow[];
  /** For memes: P&L split into the quote's move and the meme's own, and what the quote is. */
  readonly lens: PairLens | undefined;
  readonly quoteLabel: string | undefined;
}

/** One asset's changes from the account's activity, failed transactions left out. */
export function historyOf(rows: readonly ActivityRow[], assetId: string): HistoryChange[] {
  return rows
    .filter((row) => row.status !== "failed")
    .flatMap((row) =>
      row.effects
        .filter((e) => e.assetId === assetId)
        .map((e) => ({ at: row.at, quantity: e.quantity })),
    );
}

/** What the account holds of one asset, what it cost, and the transactions that moved it. */
export function usePosition(account: string, asset: Asset, now: Date): PositionView {
  const { market } = useProviders();
  const holdings = useHoldings(account);
  const rows = useActivity(account);

  return useMemo(() => {
    const quantity =
      holdings.find((h) => h.assetId === asset.id)?.quantity ?? amount(0n, asset.decimals);
    const activity = rows.filter((row) =>
      row.effects.some((e) => e.assetId === asset.id && e.quantity.base !== 0n),
    );
    const history = historyOf(activity, asset.id);
    const reference = asset.kind === "meme" ? quoteReference(market, asset) : undefined;
    const basis = basisFromHistory(
      quantity,
      history,
      OPENING_AT,
      (at) => market.price(asset.id, at),
      reference?.priceAt,
    );
    const valueCents = valueInCents(quantity, market.price(asset.id, now));
    return {
      quantity,
      valueCents,
      basis,
      averagePrice: averagePrice(basis),
      pnl: unrealized(basis, valueCents),
      activity,
      lens:
        reference === undefined ? undefined : pairLens(basis, valueCents, reference.priceAt(now)),
      quoteLabel: reference?.label,
    };
  }, [holdings, rows, asset, market, now]);
}
