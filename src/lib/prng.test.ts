import { describe, expect, it } from "vitest";
import { createRandom, randomAt } from "./prng";

describe("prng", () => {
  it("repeats exactly for the same seed and differs for another", () => {
    const a = createRandom("rhwl");
    const b = createRandom("rhwl");
    const c = createRandom("other");
    const seq = (next: () => number) => Array.from({ length: 5 }, next);
    const first = seq(a);
    expect(seq(b)).toEqual(first);
    expect(seq(c)).not.toEqual(first);
  });

  it("stays in [0, 1) and spreads evenly", () => {
    const next = createRandom("spread");
    const values = Array.from({ length: 20_000 }, next);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.49);
    expect(mean).toBeLessThan(0.51);
  });

  it("gives a stable value per key", () => {
    expect(randomAt("NVDA:1")).toBe(randomAt("NVDA:1"));
    expect(randomAt("NVDA:1")).not.toBe(randomAt("NVDA:2"));
  });
});
