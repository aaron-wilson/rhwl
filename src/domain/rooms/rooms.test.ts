import { describe, expect, it } from "vitest";
import { amount } from "../money/amount";
import { badgeFor, holdingSince, roomMessages, sentimentBps, SLOT_MS } from "./rooms";

const DAY = 24 * 60 * 60 * 1000;
const u = (n: bigint) => amount(n, 0);
const d = (day: number) => new Date(Date.UTC(2026, 8, day));

describe("badgeFor", () => {
  it.each([
    [0, "New holder"],
    [7 * DAY - 1, "New holder"],
    [7 * DAY, "Steady hands"],
    [30 * DAY - 1, "Steady hands"],
    [30 * DAY, "Diamond hands"],
    [90 * DAY, "Legend"],
  ])("%i ms held is %s", (ms, badge) => {
    expect(badgeFor(ms)).toBe(badge);
  });
});

describe("holdingSince", () => {
  it("counts from the opening when history explains nothing", () => {
    expect(holdingSince(u(5n), [], d(1))).toEqual(d(1));
  });

  it("keeps the start through partial sells and top-ups", () => {
    const history = [
      { at: d(10), quantity: u(-2n) },
      { at: d(12), quantity: u(3n) },
    ];
    expect(holdingSince(u(5n), history, d(1))).toEqual(d(1));
  });

  it("restarts after selling out", () => {
    const history = [
      { at: d(10), quantity: u(-4n) },
      { at: d(15), quantity: u(2n) },
    ];
    expect(holdingSince(u(2n), history, d(1))).toEqual(d(15));
  });

  it("is undefined when nothing is held", () => {
    expect(holdingSince(u(0n), [{ at: d(3), quantity: u(-1n) }], d(1))).toBeUndefined();
  });
});

describe("roomMessages", () => {
  const now = new Date("2026-09-29T16:00:00Z");

  it("is the same for the same seed, ticker and time", () => {
    expect(roomMessages("rhwl", "NVDA", now)).toEqual(roomMessages("rhwl", "NVDA", now));
    expect(roomMessages("rhwl", "NVDA", now)).not.toEqual(roomMessages("rhwl", "AAPL", now));
  });

  it("is newest first, never from the future, and names the ticker", () => {
    const messages = roomMessages("rhwl", "NVDA", now);
    expect(messages).toHaveLength(25);
    messages.forEach((m, i) => {
      expect(m.at.getTime()).toBeLessThanOrEqual(now.getTime());
      if (i > 0) expect(m.at.getTime()).toBeLessThanOrEqual(messages[i - 1]?.at.getTime() ?? 0);
      expect(m.text).not.toContain("{T}");
    });
  });

  it("keeps earlier messages as time passes and adds new ones on top", () => {
    const before = roomMessages("rhwl", "NVDA", now);
    const later = roomMessages("rhwl", "NVDA", new Date(now.getTime() + 20 * SLOT_MS));
    expect(later.map((m) => m.id)).toEqual(
      expect.arrayContaining(before.slice(0, 5).map((m) => m.id)),
    );
    expect(later[0]?.at.getTime()).toBeGreaterThan(before[0]?.at.getTime() ?? 0);
  });

  it("measures sentiment as the bullish share", () => {
    const messages = roomMessages("rhwl", "NVDA", now);
    const bulls = messages.filter((m) => m.mood === "bull").length;
    expect(sentimentBps(messages)).toBe(Math.round((bulls * 10_000) / messages.length));
    expect(sentimentBps([])).toBe(5_000);
  });
});
