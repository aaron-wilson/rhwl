import { describe, expect, it } from "vitest";
import { etToUtc, lastClose, marketState } from "./hours";

const at = (iso: string) => new Date(iso);

describe("etToUtc", () => {
  it.each([
    ["2026-03-06", "2026-03-06T14:30:00.000Z"],
    ["2026-03-09", "2026-03-09T13:30:00.000Z"],
    ["2026-10-30", "2026-10-30T13:30:00.000Z"],
    ["2026-11-02", "2026-11-02T14:30:00.000Z"],
  ])("9:30 ET on %s is %s across the DST switches", (date, iso) => {
    expect(etToUtc(date, 9 * 60 + 30).toISOString()).toBe(iso);
  });
});

describe("marketState", () => {
  it.each([
    ["Tuesday midday", "2026-09-29T16:00:00Z", "open", undefined, "2026-09-29T13:30:00.000Z"],
    ["Tuesday pre-market", "2026-09-29T12:00:00Z", "pre", undefined, "2026-09-29T13:30:00.000Z"],
    ["Tuesday after-hours", "2026-09-29T21:30:00Z", "after", undefined, "2026-09-30T13:30:00.000Z"],
    [
      "Tuesday overnight",
      "2026-09-30T02:00:00Z",
      "closed",
      "overnight",
      "2026-09-30T13:30:00.000Z",
    ],
    ["Friday 8 PM ET", "2026-10-03T00:00:00Z", "closed", "overnight", "2026-10-05T13:30:00.000Z"],
    ["Saturday", "2026-10-03T16:00:00Z", "closed", "weekend", "2026-10-05T13:30:00.000Z"],
    ["Sunday night", "2026-10-05T03:00:00Z", "closed", "weekend", "2026-10-05T13:30:00.000Z"],
    ["Labor Day", "2026-09-07T15:00:00Z", "closed", "holiday", "2026-09-08T13:30:00.000Z"],
    [
      "Friday before Labor Day, after close",
      "2026-09-05T01:00:00Z",
      "closed",
      "overnight",
      "2026-09-08T13:30:00.000Z",
    ],
    ["MLK Day 2027", "2027-01-18T15:00:00Z", "closed", "holiday", "2027-01-19T14:30:00.000Z"],
    [
      "Juneteenth (Friday) rolls to Monday",
      "2026-06-19T15:00:00Z",
      "closed",
      "holiday",
      "2026-06-22T13:30:00.000Z",
    ],
    [
      "Black Friday 12:59 PM ET",
      "2026-11-27T17:59:00Z",
      "open",
      undefined,
      "2026-11-27T14:30:00.000Z",
    ],
    [
      "Black Friday 1:00 PM ET",
      "2026-11-27T18:00:00Z",
      "after",
      undefined,
      "2026-11-30T14:30:00.000Z",
    ],
    [
      "Black Friday 5:00 PM ET",
      "2026-11-27T22:00:00Z",
      "closed",
      "overnight",
      "2026-11-30T14:30:00.000Z",
    ],
    [
      "First Monday after DST ends",
      "2026-11-02T14:29:00Z",
      "pre",
      undefined,
      "2026-11-02T14:30:00.000Z",
    ],
    [
      "New Year's Eve into holiday",
      "2026-12-31T22:00:00Z",
      "after",
      undefined,
      "2027-01-04T14:30:00.000Z",
    ],
  ] as const)("%s", (_name, iso, session, reason, nextOpen) => {
    const state = marketState(at(iso));
    expect(state.session).toBe(session);
    expect(state.reason).toBe(reason);
    expect(state.nextOpen.toISOString()).toBe(nextOpen);
  });

  it("reports the early close time on a half day", () => {
    expect(marketState(at("2026-12-24T15:00:00Z")).closesAt?.toISOString()).toBe(
      "2026-12-24T18:00:00.000Z",
    );
  });

  it("does not depend on the machine's time zone", () => {
    const state = marketState(at("2026-09-29T13:30:00Z"));
    expect(state.session).toBe("open");
  });
});

describe("lastClose", () => {
  it.each([
    ["Saturday → Friday 4 PM ET", "2026-10-03T16:00:00Z", "2026-10-02T20:00:00.000Z"],
    ["During the session → yesterday", "2026-09-29T16:00:00Z", "2026-09-28T20:00:00.000Z"],
    ["Exactly at the close", "2026-09-29T20:00:00Z", "2026-09-29T20:00:00.000Z"],
    ["After Black Friday's early close", "2026-11-28T12:00:00Z", "2026-11-27T18:00:00.000Z"],
    ["Labor Day → the Friday before", "2026-09-07T16:00:00Z", "2026-09-04T20:00:00.000Z"],
  ])("%s", (_name, iso, close) => {
    expect(lastClose(new Date(iso)).toISOString()).toBe(close);
  });
});
