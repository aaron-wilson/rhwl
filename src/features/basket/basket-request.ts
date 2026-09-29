import { valueInCents } from "../../domain/money/amount";
import { allocate, rebalanceCents, type Weight } from "../../domain/basket/basket";
import type { Holding, TxRequest } from "../../ports/chain";
import type { Market } from "../../ports/market";
import { buyLeg, requestFromLegs, sellLeg } from "../trade";

export { USDG } from "../trade";

/** Buys a whole basket with `totalCents` of USDG in one signature, one leg per member. */
export function basketBuyRequest(
  name: string,
  weights: readonly Weight[],
  totalCents: bigint,
  market: Market,
  now: Date,
): TxRequest | undefined {
  const legs = allocate(totalCents, weights).map((cents, i) =>
    buyLeg(weights[i]?.assetId ?? "", cents, market, now),
  );
  if (legs.some((leg) => leg === undefined)) return undefined;
  return requestFromLegs(
    "Bought",
    `into ${name}`,
    legs.filter((leg) => leg !== undefined),
  );
}

/** What each member of the basket is worth now, in cents. */
export function memberValues(
  weights: readonly Weight[],
  holdings: readonly Holding[],
  market: Market,
  now: Date,
): readonly bigint[] {
  return weights.map((w) => {
    const held = holdings.find((h) => h.assetId === w.assetId)?.quantity;
    return held === undefined ? 0n : valueInCents(held, market.price(w.assetId, now));
  });
}

/** Sells what is over target and buys what is under, in one signature. */
export function rebalanceRequest(
  name: string,
  weights: readonly Weight[],
  holdings: readonly Holding[],
  market: Market,
  now: Date,
): TxRequest | undefined {
  const moves = rebalanceCents(memberValues(weights, holdings, market, now), weights);
  const legs = moves.flatMap((cents, i) => {
    const assetId = weights[i]?.assetId ?? "";
    const leg =
      cents > 0n
        ? buyLeg(assetId, cents, market, now)
        : cents < 0n
          ? sellLeg(assetId, -cents, market, now)
          : undefined;
    return leg === undefined ? [] : [leg];
  });
  return requestFromLegs("Rebalanced", name, legs);
}
