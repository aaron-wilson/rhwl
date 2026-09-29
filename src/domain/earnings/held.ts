import { assetById, assets } from "../../data/assets";
import type { MemeToken, StockToken } from "../../data/types";
import type { Holding } from "../../ports/chain";
import { earningsCalendar, type CalendarEntry } from "./earnings";

const stocks = assets.filter((a): a is StockToken => a.kind === "stock");

/** The memes these holdings include. */
export function heldMemes(holdings: readonly Holding[]): MemeToken[] {
  return holdings
    .filter((h) => h.quantity.base > 0n)
    .map((h) => assetById(h.assetId))
    .filter((a): a is MemeToken => a.kind === "meme");
}

/** Upcoming reports that touch these holdings, soonest first. */
export function calendarFor(holdings: readonly Holding[], now: Date): readonly CalendarEntry[] {
  const held = new Set(holdings.filter((h) => h.quantity.base > 0n).map((h) => h.assetId));
  return earningsCalendar(
    stocks.map((s) => ({ id: s.id, nextEarnings: s.nextEarnings, held: held.has(s.id) })),
    heldMemes(holdings),
    now,
  );
}
