import { describe, expect, it } from "vitest";
import { formatCountdown, formatWhen } from "./format";

const now = new Date("2026-09-29T20:00:00Z");
const ny = "America/New_York";

describe("formatWhen", () => {
  it.each([
    ["2026-09-29T13:41:00Z", "Today · 9:41 AM"],
    ["2026-09-28T18:03:00Z", "Yesterday · 2:03 PM"],
    ["2026-09-24T22:12:00Z", "Sep 24 · 6:12 PM"],
    ["2026-09-29T03:30:00Z", "Yesterday · 11:30 PM"],
  ])("%s → %s in New York", (iso, text) => {
    expect(formatWhen(new Date(iso), now, ny)).toBe(
      text.replace(" AM", " AM").replace(" PM", " PM"),
    );
  });
});

describe("formatCountdown", () => {
  const MIN = 60_000;
  it.each([
    [-5, "under a minute"],
    [59_999, "under a minute"],
    [MIN, "1m"],
    [45 * MIN + 59_000, "45m"],
    [60 * MIN, "1h 0m"],
    [(3 * 60 + 12) * MIN, "3h 12m"],
    [(24 * 60 - 1) * MIN, "23h 59m"],
    [(2 * 1440 + 4 * 60 + 30) * MIN, "2d 4h"],
  ])("%d ms → %s", (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});
