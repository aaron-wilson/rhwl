import type { Cadence } from "./rule";

const RUN_HOUR_UTC = 15;

/** The first run strictly after `after`: at 15:00 UTC on the next matching day. */
export function nextRun(cadence: Cadence, after: Date): Date {
  const at = new Date(
    Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate(), RUN_HOUR_UTC),
  );
  if (at <= after) at.setUTCDate(at.getUTCDate() + 1);
  if (cadence.kind === "weekly") {
    while (at.getUTCDay() !== cadence.weekday) at.setUTCDate(at.getUTCDate() + 1);
  } else if (cadence.kind === "monthly") {
    // The first of the month; this month's if still ahead, otherwise next month's.
    const first = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), 1, RUN_HOUR_UTC));
    if (first > after) return first;
    return new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth() + 1, 1, RUN_HOUR_UTC));
  }
  return at;
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "every Friday", "every day", "on the 1st of each month". */
export function describeCadence(cadence: Cadence): string {
  if (cadence.kind === "daily") return "every day";
  if (cadence.kind === "monthly") return "on the 1st of each month";
  return `every ${WEEKDAY_NAMES[cadence.weekday] ?? "week"}`;
}
