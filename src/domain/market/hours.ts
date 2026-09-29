/**
 * NYSE session calendar. Every calculation happens in America/New_York wall
 * time through Intl, never in the viewer's own time zone.
 */
export type Session = "pre" | "open" | "after" | "closed";
export type ClosedReason = "weekend" | "holiday" | "overnight";

export interface MarketState {
  readonly session: Session;
  readonly reason: ClosedReason | undefined;
  /** The regular-session open (9:30 ET) that is in progress now, or else the next one. */
  readonly nextOpen: Date;
  /** When the current regular session closes; only set while open. */
  readonly closesAt: Date | undefined;
}

/** Full-day closures, 2026 and the start of 2027. */
export const holidays: ReadonlySet<string> = new Set([
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
  "2027-01-01",
  "2027-01-18",
]);

/** Days the regular session ends at 1:00 PM ET and after-hours at 5:00 PM ET. */
export const earlyCloses: ReadonlySet<string> = new Set(["2026-11-27", "2026-12-24"]);

const MINUTES = {
  preOpen: 4 * 60,
  open: 9 * 60 + 30,
  close: 16 * 60,
  earlyClose: 13 * 60,
} as const;

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
});

interface EtTime {
  readonly date: string;
  readonly weekday: string;
  readonly minutes: number;
}

const HOUR = 3_600_000;
const hourCache = new Map<number, EtTime>();

function formatEt(at: Date): EtTime {
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.formatToParts(at).find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * New York wall time. The offset from UTC is always a whole number of hours, so
 * one Intl call per UTC hour is exact; the minutes within the hour are added on.
 */
function toEt(at: Date): EtTime {
  const hour = Math.floor(at.getTime() / HOUR);
  let start = hourCache.get(hour);
  if (start === undefined) {
    if (hourCache.size > 20_000) hourCache.clear();
    start = formatEt(new Date(hour * HOUR));
    hourCache.set(hour, start);
  }
  return { ...start, minutes: start.minutes + Math.floor((at.getTime() - hour * HOUR) / 60_000) };
}

/** The UTC instant of a New York wall-clock time. EDT is UTC−4, EST is UTC−5. */
export function etToUtc(date: string, minutes: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  for (const offset of [4, 5]) {
    const candidate = new Date(
      Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, 0, minutes) + offset * 3_600_000,
    );
    const et = toEt(candidate);
    if (et.date === date && et.minutes === minutes) return candidate;
  }
  throw new RangeError(`No such New York time: ${date} +${minutes}m`);
}

const isWeekend = (weekday: string) => weekday === "Sat" || weekday === "Sun";
export const isTradingDay = (et: EtTime) => !isWeekend(et.weekday) && !holidays.has(et.date);

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days)).toISOString().slice(0, 10);
}

function nextOpenAfter(et: EtTime): Date {
  const todayOpens = isTradingDay(et) && et.minutes < MINUTES.open;
  for (let offset = todayOpens ? 0 : 1; offset < 14; offset += 1) {
    const date = addDays(et.date, offset);
    const candidate = toEt(etToUtc(date, 12 * 60));
    if (isTradingDay(candidate)) return etToUtc(date, MINUTES.open);
  }
  throw new RangeError(`No trading day within two weeks of ${et.date}`);
}

export function marketState(at: Date): MarketState {
  const et = toEt(at);
  const early = earlyCloses.has(et.date);
  const close = early ? MINUTES.earlyClose : MINUTES.close;
  const afterEnd = close + 4 * 60;
  const nextOpen = nextOpenAfter(et);
  if (!isTradingDay(et)) {
    return {
      session: "closed",
      reason: isWeekend(et.weekday) ? "weekend" : "holiday",
      nextOpen,
      closesAt: undefined,
    };
  }
  if (et.minutes >= MINUTES.open && et.minutes < close) {
    return {
      session: "open",
      reason: undefined,
      nextOpen: etToUtc(et.date, MINUTES.open),
      closesAt: etToUtc(et.date, close),
    };
  }
  if (et.minutes >= MINUTES.preOpen && et.minutes < MINUTES.open) {
    return { session: "pre", reason: undefined, nextOpen, closesAt: undefined };
  }
  if (et.minutes >= close && et.minutes < afterEnd) {
    return { session: "after", reason: undefined, nextOpen, closesAt: undefined };
  }
  return { session: "closed", reason: "overnight", nextOpen, closesAt: undefined };
}

/** The most recent regular-session close at or before `at`. */
export function lastClose(at: Date): Date {
  const et = toEt(at);
  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDays(et.date, -offset);
    const noon = toEt(etToUtc(date, 12 * 60));
    if (!isTradingDay(noon)) continue;
    const close = etToUtc(date, earlyCloses.has(date) ? MINUTES.earlyClose : MINUTES.close);
    if (close.getTime() <= at.getTime()) return close;
  }
  throw new RangeError(`No close within two weeks before ${at.toISOString()}`);
}
