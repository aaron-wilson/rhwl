import { assetById } from "../../data/assets";
import { amount, centsToUsdg } from "../../domain/money/amount";
import { quoteCents } from "../../domain/trade/order";
import { mergeDeltas } from "../../domain/tx/effects";
import type { TxLeg, TxRequest } from "../../ports/chain";
import type { Market } from "../../ports/market";
import { NETWORK_FEE } from "../transactions/actions";

export const USDG = "rh:USDG";

/** Buys `cents` of an asset with USDG at the market price, rounded down. */
export function buyLeg(
  assetId: string,
  cents: bigint,
  market: Market,
  now: Date,
): TxLeg | undefined {
  const asset = assetById(assetId);
  const quote = quoteCents(cents, asset.decimals, market.price(assetId, now));
  if (quote === undefined) return undefined;
  return {
    summary: { verb: "Buy", primary: { assetId, quantity: quote.tokens } },
    deltas: [
      { assetId: USDG, quantity: amount(-centsToUsdg(quote.cents).base, 6) },
      { assetId, quantity: quote.tokens },
    ],
  };
}

/** Sells `cents` worth of an asset for USDG at the market price. */
export function sellLeg(
  assetId: string,
  cents: bigint,
  market: Market,
  now: Date,
): TxLeg | undefined {
  const asset = assetById(assetId);
  const quote = quoteCents(cents, asset.decimals, market.price(assetId, now));
  if (quote === undefined) return undefined;
  const out = amount(-quote.tokens.base, quote.tokens.decimals);
  return {
    summary: { verb: "Sell", primary: { assetId, quantity: out } },
    deltas: [
      { assetId, quantity: out },
      { assetId: USDG, quantity: centsToUsdg(quote.cents) },
    ],
  };
}

/** One transaction from legs: their effects merged, each leg kept for the review. */
export function requestFromLegs(
  verb: string,
  detail: string,
  legs: readonly TxLeg[],
): TxRequest | undefined {
  if (legs.length === 0) return undefined;
  const deltas = mergeDeltas(legs.flatMap((leg) => leg.deltas));
  const cash = deltas.find((d) => d.assetId === USDG);
  return {
    kind: "trade",
    summary: {
      verb,
      ...(cash !== undefined && cash.quantity.base !== 0n ? { primary: cash } : {}),
      detail,
    },
    deltas,
    fee: NETWORK_FEE,
    legs,
  };
}
