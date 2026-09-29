import { describe, expect, it } from "vitest";
import { amount, parseAmount, toDecimalString, type Amount } from "../money/amount";
import { quoteOrder, sharesOf } from "./order";

const q = (text: string, decimals: number): Amount => parseAmount(text, decimals) ?? amount(0n, 0);
const price = q("200", 8);
const text = (value: Amount | undefined) =>
  value === undefined ? undefined : toDecimalString(value);

describe("quoteOrder", () => {
  it("buys by dollars, rounding tokens down", () => {
    const quote = quoteOrder("$50", "usd", 18, price);
    expect(text(quote?.tokens)).toBe("0.250000000000000000");
    expect(quote?.cents).toBe(5_000n);
  });

  it("buys fractional shares through the multiplier", () => {
    // 1.000054 shares per token: 1 share is 0.99994600... tokens.
    const quote = quoteOrder("1", "units", 18, price, q("1.000054", 12));
    expect(text(quote?.tokens)).toBe("0.999946002915842544");
    expect(text(sharesOf(quote?.tokens ?? amount(0n, 18), q("1.000054", 12)))).toBe("0.999999");
  });

  it("treats units as tokens without a multiplier", () => {
    expect(text(quoteOrder("0.5", "units", 18, q("3000", 8))?.tokens)).toBe("0.500000000000000000");
  });

  it("after a 3-for-1 split, a token is worth 3 shares", () => {
    expect(text(quoteOrder("3", "units", 18, price, q("3", 12))?.tokens)).toBe(
      "1.000000000000000000",
    );
  });

  it.each([
    ["0", "usd"],
    ["-5", "usd"],
    ["1.001", "usd"],
    ["abc", "units"],
    ["", "units"],
  ] as const)("rejects %j in %s", (input, unit) => {
    expect(quoteOrder(input, unit, 18, price)).toBeUndefined();
  });
});
