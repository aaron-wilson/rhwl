import type { Condition } from "../../domain/agent/rule";
import { changeBps } from "../../domain/market/change";
import { formatPercentBps, formatPrice } from "../../domain/money/format";
import { amount } from "../../domain/money/amount";
import type { Market } from "../../ports/market";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether a buy's condition holds now; the note says why either way, in words. */
export function checkCondition(
  condition: Condition,
  assetId: string,
  symbol: string,
  market: Market,
  now: Date,
): { readonly met: boolean; readonly note: string } {
  const price = market.price(assetId, now);
  if (condition.kind === "below-price") {
    const limit = amount(condition.priceCents * 1_000_000n, 8);
    const met = price.base < limit.base;
    return { met, note: `${symbol} at ${formatPrice(price)}, limit ${formatPrice(limit)}` };
  }
  if (condition.kind === "down-today") {
    const move = changeBps(price, market.reference(assetId, now).price);
    return {
      met: move <= -condition.bps,
      note: `${symbol} ${formatPercentBps(move)} today, needs −${formatPercentBps(condition.bps, "negative")}`,
    };
  }
  const points = market.series(
    assetId,
    new Date(now.getTime() - condition.days * DAY_MS),
    now,
    condition.days + 1,
  );
  const mean =
    points.reduce((sum, p) => sum + p.price.base, 0n) / BigInt(Math.max(1, points.length));
  const average = amount(mean, 8);
  return {
    met: price.base < mean,
    note: `${symbol} at ${formatPrice(price)}, ${condition.days}-day average ${formatPrice(average)}`,
  };
}
