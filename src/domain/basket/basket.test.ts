import { describe, expect, it } from "vitest";
import {
  allocate,
  currentBps,
  evenSplit,
  maxDriftBps,
  rebalanceCents,
  weightProblems,
  type Weight,
} from "./basket";

const w = (...bps: number[]): Weight[] => bps.map((b, i) => ({ assetId: `a${i}`, bps: b }));

describe("weightProblems", () => {
  it.each([
    ["a full basket", w(5000, 3000, 2000), []],
    ["no members", [], ["Add at least one asset."]],
    ["under 100%", w(5000, 3000), ["Weights add up to 80.00%, not 100%."]],
    ["a zero weight", w(10000, 0), ["Every weight must be above 0%."]],
    ["a fractional basis point", w(9999.5, 0.5), ["Every weight must be above 0%."]],
    [
      "a duplicate",
      [
        { assetId: "a", bps: 5000 },
        { assetId: "a", bps: 5000 },
      ],
      ["Each asset can appear only once."],
    ],
    ["nine members", w(...Array<number>(8).fill(1100), 1200), ["A basket holds at most 8 assets."]],
  ])("%s", (_name, weights, problems) => {
    expect(weightProblems(weights)).toEqual(problems);
  });
});

describe("allocate", () => {
  it("splits by weight", () => {
    expect(allocate(10_000n, w(5000, 3000, 2000))).toEqual([5_000n, 3_000n, 2_000n]);
  });

  it.each([
    [100n, w(3333, 3333, 3334)],
    [1n, w(5000, 5000)],
    [99_999n, w(1, 9999)],
    [12_345n, w(1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250)],
  ])("gives the rounding remainder to the last leg, so %i cents sum exactly", (total, weights) => {
    const legs = allocate(total, weights);
    expect(legs.reduce((sum, c) => sum + c, 0n)).toBe(total);
    legs.slice(0, -1).forEach((c, i) => {
      expect(c).toBe((total * BigInt(weights[i]?.bps ?? 0)) / 10_000n);
    });
  });
});

describe("drift and rebalance", () => {
  it("measures each member's share of current value", () => {
    expect(currentBps([6_000n, 3_000n, 1_000n])).toEqual([6000, 3000, 1000]);
    expect(currentBps([0n, 0n])).toEqual([0, 0]);
  });

  it("reports the largest gap from target", () => {
    expect(maxDriftBps([6_000n, 3_000n, 1_000n], w(5000, 3000, 2000))).toBe(1000);
  });

  it("moves value back to target with no new cash", () => {
    const moves = rebalanceCents([6_000n, 3_000n, 1_000n], w(5000, 3000, 2000));
    expect(moves).toEqual([-1_000n, 0n, 1_000n]);
    expect(moves.reduce((sum, c) => sum + c, 0n)).toBe(0n);
  });
});

describe("evenSplit", () => {
  it.each([1, 3, 6, 7])("splits %i members into weights summing to 100%%", (n) => {
    const weights = evenSplit(Array.from({ length: n }, (_, i) => `a${i}`));
    expect(weights.reduce((sum, x) => sum + x.bps, 0)).toBe(10_000);
    expect(weightProblems(weights)).toEqual([]);
  });
});
