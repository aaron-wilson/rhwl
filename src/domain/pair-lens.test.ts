import { describe, expect, it } from "vitest";
import { amount } from "./money/amount";
import { basketIndex, pairLens } from "./pair-lens";
import { basisFromHistory } from "./portfolio/cost-basis";

const usd = (dollars: bigint) => amount(dollars * 10n ** 8n, 8);
const units = (n: bigint) => amount(n * 10n ** 18n, 18);
const opened = new Date("2026-08-28T20:00:00Z");
const later = new Date("2026-09-15T20:00:00Z");

/** A position bought at `opened` for $1,000 (1,000 tokens at $1), with the quote at `quoteThen`. */
function lens(memeNow: bigint, quoteThen: bigint, quoteNow: bigint, sells = 0n) {
  const history = sells === 0n ? [] : [{ at: later, quantity: units(-sells) }];
  const held = units(1_000n - sells);
  const basis = basisFromHistory(
    held,
    history,
    opened,
    () => usd(1n),
    () => usd(quoteThen),
  );
  const valueCents = (1_000n - sells) * memeNow * 100n;
  return pairLens(basis, valueCents, usd(quoteNow));
}

describe("pairLens", () => {
  it.each([
    // [meme now $, quote then $, quote now $, total ¢, beta ¢, alpha ¢, quote bps]
    ["stock up, meme up more", 2n, 100n, 110n, 100_000n, 10_000n, 90_000n, 1_000n],
    ["stock up, meme down", 1n, 100n, 120n, 0n, 20_000n, -20_000n, 2_000n],
    ["stock down, meme flat", 1n, 200n, 150n, 0n, -25_000n, 25_000n, -2_500n],
    ["both down", 0n, 50n, 25n, -100_000n, -50_000n, -50_000n, -5_000n],
  ])("%s", (_name, memeNow, quoteThen, quoteNow, total, beta, alpha, bps) => {
    expect(lens(memeNow, quoteThen, quoteNow)).toEqual({
      totalCents: total,
      betaCents: beta,
      alphaCents: alpha,
      quoteBps: bps,
    });
  });

  it("adds up to the total exactly, with rounding in alpha", () => {
    // $1,000 at a $3 quote buys 333.33… shadow units; at $7 they are worth $2,333.33.
    const result = lens(2n, 3n, 7n);
    expect(result?.betaCents).toBe(133_333n);
    expect((result?.betaCents ?? 0n) + (result?.alphaCents ?? 0n)).toBe(result?.totalCents);
  });

  it("scales both parts with a partial sale", () => {
    const whole = lens(2n, 100n, 110n);
    const half = lens(2n, 100n, 110n, 500n);
    expect(half?.betaCents).toBe((whole?.betaCents ?? 0n) / 2n);
    expect(half?.alphaCents).toBe((whole?.alphaCents ?? 0n) / 2n);
  });

  it("is undefined with no cost or no reference", () => {
    const empty = basisFromHistory(
      units(0n),
      [],
      opened,
      () => usd(1n),
      () => usd(1n),
    );
    expect(pairLens(empty, 0n, usd(1n))).toBeUndefined();
    const unreferenced = basisFromHistory(units(10n), [], opened, () => usd(1n));
    expect(pairLens(unreferenced, 1_000n, usd(1n))).toBeUndefined();
  });
});

describe("basketIndex", () => {
  it("is 100 at the base prices", () => {
    expect(basketIndex([usd(10n), usd(200n)], [usd(10n), usd(200n)])).toEqual(usd(100n));
  });

  it("moves as the average of its members' moves, whatever their prices", () => {
    // +10% and −30% average to −10%.
    expect(basketIndex([usd(11n), usd(140n)], [usd(10n), usd(200n)])).toEqual(usd(90n));
  });

  it("rejects mismatched members", () => {
    expect(() => basketIndex([usd(1n)], [])).toThrow(RangeError);
  });
});
