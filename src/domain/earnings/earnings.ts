import { etToUtc } from "../market/hours";
import { divRound } from "../money/amount";
import { valueAtShock } from "../whatif";

const HOUR_MS = 3_600_000;
/** From the 4:00 PM ET close on earnings day to the next morning's 9:30 AM open. */
const NIGHT_MS = 17.5 * HOUR_MS;

/** When earnings night starts and ends for a report date ("2026-11-18"). */
export function earningsNight(date: string): { readonly start: Date; readonly end: Date } {
  const start = etToUtc(date, 16 * 60);
  return { start, end: new Date(start.getTime() + NIGHT_MS) };
}

export const isEarningsNight = (date: string, now: Date): boolean => {
  const { start, end } = earningsNight(date);
  return now >= start && now < end;
};

export interface CalendarEntry {
  readonly assetId: string;
  readonly date: string;
  readonly held: boolean;
  /** Held memes quoted against this stock. */
  readonly pairedMemes: readonly string[];
}

/**
 * Upcoming reports for held Stock Tokens and for stocks that held memes are
 * paired to, soonest first. A report stays listed until its night is over.
 */
export function earningsCalendar(
  stocks: readonly { readonly id: string; readonly nextEarnings: string; readonly held: boolean }[],
  heldMemes: readonly { readonly symbol: string; readonly quotes: readonly string[] }[],
  now: Date,
): readonly CalendarEntry[] {
  return stocks
    .map((s) => ({
      assetId: s.id,
      date: s.nextEarnings,
      held: s.held,
      pairedMemes: heldMemes.filter((m) => m.quotes.includes(s.id)).map((m) => m.symbol),
    }))
    .filter((e) => (e.held || e.pairedMemes.length > 0) && earningsNight(e.date).end > now)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Everything riding on one stock: the token, memes paired to it, and perps on it. In cents. */
export interface Exposure {
  readonly tokenCents: bigint;
  readonly memes: readonly { readonly symbol: string; readonly valueCents: bigint }[];
  /** Signed perp size: longs positive, shorts negative. */
  readonly perpCents: bigint;
}

export function totalExposure(e: Exposure): bigint {
  return e.tokenCents + e.memes.reduce((sum, m) => sum + m.valueCents, 0n) + e.perpCents;
}

/**
 * How the whole exposure's value changes if the stock moves `bps`: the token
 * and paired memes (assumed to hold their pairs) move with it, and a perp gains
 * or loses its signed size times the move.
 */
export function exposureChangeAtShock(e: Exposure, bps: number): bigint {
  const holdings = e.tokenCents + e.memes.reduce((sum, m) => sum + m.valueCents, 0n);
  return valueAtShock(holdings, bps) - holdings + divRound(e.perpCents * BigInt(bps), 10_000n);
}
