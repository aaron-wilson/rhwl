const DAY = 86_400_000;

/**
 * "Today · 9:41 PM", "Yesterday · 2:03 PM" or "Sep 24 · 6:12 PM", relative to
 * the app clock's `now`. `timeZone` defaults to the viewer's own.
 */
export function formatWhen(at: Date, now: Date, timeZone?: string): string {
  const zone = timeZone === undefined ? {} : { timeZone };
  const dayOf = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { ...zone, dateStyle: "short" }).format(d);
  // Engines disagree on the space before AM/PM (narrow no-break or plain); always use plain.
  const time = new Intl.DateTimeFormat("en-US", { ...zone, hour: "numeric", minute: "2-digit" })
    .format(at)
    .replace(/\s/g, " ");
  if (dayOf(at) === dayOf(now)) return `Today · ${time}`;
  if (dayOf(at) === dayOf(new Date(now.getTime() - DAY))) return `Yesterday · ${time}`;
  const date = new Intl.DateTimeFormat("en-US", { ...zone, month: "short", day: "numeric" }).format(
    at,
  );
  return `${date} · ${time}`;
}

/** A time span for countdowns, two units at most: "2d 4h", "3h 12m", "45m", "under a minute". */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "under a minute";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
