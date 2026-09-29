import type { Asset } from "../../data/types";
import { valueInCents, type Amount } from "../money/amount";
import { changeBetween, type Change, type Position } from "../portfolio/portfolio";

export interface GapLine {
  readonly asset: Asset;
  readonly quantity: Amount;
  readonly atCloseCents: bigint;
  readonly nowCents: bigint;
  readonly change: Change;
}

export interface Gap {
  /** Held stock tokens, largest move first. */
  readonly stocks: readonly GapLine[];
  /** Held memes that trade against a stock token, largest move first. */
  readonly pairedMemes: readonly GapLine[];
  /** Stock tokens and paired memes together. */
  readonly total: Change;
}

const magnitude = (c: Change) => (c.bps < 0n ? -c.bps : c.bps);
const byMove = (a: GapLine, b: GapLine) =>
  magnitude(b.change) > magnitude(a.change)
    ? 1
    : magnitude(b.change) < magnitude(a.change)
      ? -1
      : 0;

/**
 * How far the stock-linked part of a portfolio has drifted since the last close:
 * what it would gap into if the listing opened at today's on-chain prices.
 */
export function gapSince(
  positions: readonly Position[],
  assetOf: (id: string) => Asset,
  priceAtClose: (id: string) => Amount,
  priceNow: (id: string) => Amount,
): Gap {
  const lines = positions.flatMap((p): GapLine[] => {
    const asset = assetOf(p.assetId);
    const linked =
      asset.kind === "stock" ||
      (asset.kind === "meme" && asset.quotes.some((q) => assetOf(q).kind === "stock"));
    if (!linked || p.quantity.base === 0n) return [];
    const atCloseCents = valueInCents(p.quantity, priceAtClose(p.assetId));
    const nowCents = valueInCents(p.quantity, priceNow(p.assetId));
    return [
      {
        asset,
        quantity: p.quantity,
        atCloseCents,
        nowCents,
        change: changeBetween(atCloseCents, nowCents),
      },
    ];
  });
  const sum = (pick: (l: GapLine) => bigint) => lines.reduce((s, l) => s + pick(l), 0n);
  return {
    stocks: lines.filter((l) => l.asset.kind === "stock").sort(byMove),
    pairedMemes: lines.filter((l) => l.asset.kind === "meme").sort(byMove),
    total: changeBetween(
      sum((l) => l.atCloseCents),
      sum((l) => l.nowCents),
    ),
  };
}
