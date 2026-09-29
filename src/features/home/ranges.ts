export type RangeKey = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Stock Tokens launched on Robinhood Chain here; ALL starts at this instant. */
const LAUNCH = Date.UTC(2026, 6, 1);

export const ranges: readonly {
  readonly key: RangeKey;
  readonly label: string;
  readonly phrase: string;
}[] = [
  { key: "1D", label: "1D", phrase: "today" },
  { key: "1W", label: "1W", phrase: "past week" },
  { key: "1M", label: "1M", phrase: "past month" },
  { key: "3M", label: "3M", phrase: "past 3 months" },
  { key: "1Y", label: "1Y", phrase: "past year" },
  { key: "ALL", label: "ALL", phrase: "all time" },
];

const spans: Record<RangeKey, number> = {
  "1D": DAY,
  "1W": 7 * DAY,
  "1M": 30 * DAY,
  "3M": 91 * DAY,
  "1Y": 365 * DAY,
  ALL: 0,
};

/** The window a range covers ending at `now`, with a point count that keeps charts smooth and cheap. */
export function rangeWindow(range: RangeKey, now: Date): { from: Date; to: Date; points: number } {
  const span = range === "ALL" ? Math.max(DAY, now.getTime() - LAUNCH) : spans[range];
  // Snap to the minute so the series cache hits while the clock ticks within a minute.
  const to = Math.floor(now.getTime() / 60_000) * 60_000;
  return { from: new Date(to - span), to: new Date(to), points: range === "1D" ? 145 : 240 };
}
