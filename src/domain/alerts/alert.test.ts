import { describe, expect, it } from "vitest";
import { canArm, checkAlerts, crossed, type PriceAlert } from "./alert";

const at = new Date("2026-09-29T16:00:00Z");
const alert = (over: Partial<PriceAlert> = {}): PriceAlert => ({
  id: 1,
  assetId: "rh:NVDA",
  direction: "above",
  thresholdCents: 20_000n,
  armed: true,
  firedAt: undefined,
  ...over,
});

describe("price alerts", () => {
  it("crosses at or past the threshold in its direction", () => {
    expect(crossed("above", 20_000n, 20_000n)).toBe(true);
    expect(crossed("above", 20_000n, 19_999n)).toBe(false);
    expect(crossed("below", 20_000n, 20_000n)).toBe(true);
    expect(crossed("below", 20_000n, 20_001n)).toBe(false);
  });

  it("arms only from the other side of a positive threshold", () => {
    expect(canArm("above", 20_000n, 19_000n)).toBe(true);
    expect(canArm("above", 20_000n, 21_000n)).toBe(false);
    expect(canArm("below", 20_000n, 21_000n)).toBe(true);
    expect(canArm("above", 0n, -1n)).toBe(false);
  });

  it("fires once when crossed and not again until re-armed", () => {
    const first = checkAlerts([alert()], () => 20_500n, at);
    expect(first.fired.map((a) => a.id)).toEqual([1]);
    expect(first.alerts[0]).toMatchObject({ armed: false, firedAt: at });
    const second = checkAlerts(first.alerts, () => 21_000n, at);
    expect(second.fired).toEqual([]);
    expect(second.alerts).toBe(first.alerts);
    const rearmed = first.alerts.map((a) => ({ ...a, armed: true }));
    expect(checkAlerts(rearmed, () => 21_000n, at).fired).toHaveLength(1);
  });

  it("leaves armed alerts that have not crossed alone", () => {
    const list = [alert(), alert({ id: 2, direction: "below", thresholdCents: 10_000n })];
    const result = checkAlerts(list, () => 15_000n, at);
    expect(result.fired).toEqual([]);
    expect(result.alerts).toBe(list);
  });
});
