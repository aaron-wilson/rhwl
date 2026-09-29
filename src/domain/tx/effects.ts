import { assetById } from "../../data/assets";
import type { BalanceDelta, Holding, TxRequest } from "../../ports/chain";
import { add, amount, type Amount } from "../money/amount";

const zero = (assetId: string) => amount(0n, assetById(assetId).decimals);

/** Deltas merged per asset, in first-seen order. */
export function mergeDeltas(deltas: readonly BalanceDelta[]): readonly BalanceDelta[] {
  const merged = new Map<string, Amount>();
  deltas.forEach(({ assetId, quantity }) => {
    merged.set(assetId, add(merged.get(assetId) ?? zero(assetId), quantity));
  });
  return [...merged].map(([assetId, quantity]) => ({ assetId, quantity }));
}

/** All effects of a request on the sender, fee included, merged per asset. */
export function netEffects(request: TxRequest): readonly BalanceDelta[] {
  return mergeDeltas([...request.deltas, request.fee]);
}

/** Holdings with extra deltas applied on top, e.g. transactions still in flight. */
export function applyDeltas(
  holdings: readonly Holding[],
  deltas: readonly BalanceDelta[],
): readonly Holding[] {
  const book = new Map(holdings.map((h) => [h.assetId, h.quantity]));
  deltas.forEach(({ assetId, quantity }) =>
    book.set(assetId, add(book.get(assetId) ?? zero(assetId), quantity)),
  );
  return [...book]
    .filter(([, q]) => q.base !== 0n)
    .map(([assetId, quantity]) => ({ assetId, quantity }));
}
