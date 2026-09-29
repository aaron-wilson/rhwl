import { describe, expect, it } from "vitest";
import { amount, toDecimalString } from "../money/amount";
import { emptyVault, grow, VAULT_APY, vaultBalance, vaultEarned, vaultMove } from "./vault";

const DAY = 24 * 3_600_000;
const start = new Date("2026-09-29T16:00:00Z");
const usdg = (whole: bigint) => amount(whole * 1_000_000n, 6);
const dollars = (value: { base: bigint; decimals: number }) => Number(toDecimalString(value));

describe("vault yield", () => {
  it("matches the APY formula over a week", () => {
    const week = grow(usdg(10_000n), 7 * DAY);
    const expected = 10_000 * (Math.pow(1 + VAULT_APY, 7 / 365) - 1);
    expect(dollars(week) - 10_000).toBeCloseTo(expected, 5);
    expect(toDecimalString(week)).toBe("10012.984053");
  });

  it("returns exactly 7% over a year", () => {
    expect(toDecimalString(grow(usdg(10_000n), 365 * DAY))).toBe("10700.000000");
  });

  it("does nothing for no time", () => {
    expect(grow(usdg(5n), 0)).toEqual(usdg(5n));
  });
});

describe("vault position", () => {
  it("compounds on every move and tracks what was earned", () => {
    let p = vaultMove(emptyVault(6, start), usdg(1_000n), start);
    const later = new Date(start.getTime() + 30 * DAY);
    expect(dollars(vaultEarned(p, later))).toBeCloseTo(1_000 * (Math.pow(1.07, 30 / 365) - 1), 5);
    p = vaultMove(p, amount(-500_000_000n, 6), later);
    expect(dollars(vaultBalance(p, later))).toBeCloseTo(500 + 5.576, 2);
    // Earnings survive the withdrawal: they are what is left above the net deposit.
    expect(dollars(vaultEarned(p, later))).toBeCloseTo(5.576, 2);
  });
});
