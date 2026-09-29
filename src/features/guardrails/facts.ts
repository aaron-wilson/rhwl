import { assetById } from "../../data/assets";
import { valueInCents } from "../../domain/money/amount";
import { WEEK_MS, type GuardrailFacts } from "../../domain/policy/guardrails";
import type { BalanceDelta, ChainTx, TxRequest } from "../../ports/chain";
import type { Market } from "../../ports/market";

const isMeme = (assetId: string) => assetById(assetId).kind === "meme";

const worth = (deltas: readonly BalanceDelta[], market: Market, at: Date) =>
  deltas.reduce((sum, d) => sum + valueInCents(d.quantity, market.price(d.assetId, at)), 0n);

const memeBuys = (request: TxRequest) =>
  request.deltas.filter((d) => d.quantity.base > 0n && isMeme(d.assetId));

/** A request adds risk when it opens leverage or brings in anything but a stablecoin. */
export const addsRisk = (request: TxRequest) =>
  request.leverage !== undefined ||
  request.deltas.some((d) => d.quantity.base > 0n && assetById(d.assetId).kind !== "stable");

const settledNewestFirst = (history: readonly ChainTx[]) =>
  history
    .filter((tx) => tx.status === "confirmed" && tx.settledAt !== undefined)
    .sort((a, b) => (b.settledAt?.getTime() ?? 0) - (a.settledAt?.getTime() ?? 0));

/** Dollars put into memes in the seven days before `now`, valued when each buy settled. */
export function memeSpentCents(history: readonly ChainTx[], market: Market, now: Date): bigint {
  const weekAgo = now.getTime() - WEEK_MS;
  return settledNewestFirst(history)
    .filter((tx) => (tx.settledAt?.getTime() ?? 0) > weekAgo)
    .reduce((sum, tx) => sum + worth(memeBuys(tx.request), market, tx.settledAt ?? now), 0n);
}

/** Everything the guardrails weigh for one request, from the request, the chain's history and the market. */
export function guardrailFacts(
  request: TxRequest,
  history: readonly ChainTx[],
  market: Market,
  now: Date,
): GuardrailFacts {
  const outcomes = settledNewestFirst(history).filter(
    (tx) => tx.request.realizedCents !== undefined,
  );
  const firstWin = outcomes.findIndex((tx) => (tx.request.realizedCents ?? 0n) >= 0n);
  const lossStreak = firstWin === -1 ? outcomes.length : firstWin;
  return {
    now,
    addsRisk: addsRisk(request),
    memeBuyCents: worth(memeBuys(request), market, now),
    memeSpentCents: memeSpentCents(history, market, now),
    valueCents: -worth(
      request.deltas.filter((d) => d.quantity.base < 0n),
      market,
      now,
    ),
    leverage: request.leverage,
    lossStreak,
    lastLossAt: lossStreak > 0 ? outcomes[0]?.settledAt : undefined,
  };
}
