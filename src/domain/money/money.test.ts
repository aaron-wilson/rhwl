import { describe, expect, it } from "vitest";
import {
  add,
  amount,
  compare,
  divRound,
  mulDiv,
  parseAmount,
  rescale,
  sub,
  toDecimalString,
  toPlainDecimal,
  valueInCents,
} from "./amount";
import { decodeAmount, encodeAmount } from "./codec";
import {
  formatFiat,
  formatFiatCompact,
  formatPercentBps,
  formatDecimal,
  formatPrice,
  formatToken,
} from "./format";

const eth = (text: string) => parseAmount(text, 18) ?? amount(0n, 18);
const usd8 = (text: string) => parseAmount(text, 8) ?? amount(0n, 8);

describe("divRound", () => {
  it.each([
    [5n, 2n, 2n],
    [7n, 2n, 4n],
    [-5n, 2n, -2n],
    [-7n, 2n, -4n],
    [26n, 10n, 3n],
    [24n, 10n, 2n],
  ])("half-even %s / %s = %s", (n, d, q) => {
    expect(divRound(n, d)).toBe(q);
  });

  it("truncates toward zero with rounding down", () => {
    expect(divRound(-19n, 10n, "down")).toBe(-1n);
  });

  it("rejects division by zero", () => {
    expect(() => divRound(1n, 0n)).toThrow(RangeError);
  });
});

describe("parseAmount", () => {
  it.each([
    ["1.2044", 4, 12044n],
    ["1,204.5", 2, 120450n],
    ["0.25", 6, 250000n],
    [".5", 1, 5n],
    ["7", 0, 7n],
    ["-3.1", 1, -31n],
  ])("parses %s at %s decimals", (text, decimals, base) => {
    expect(parseAmount(text, decimals)?.base).toBe(base);
  });

  it.each(["", ".", "-", "1.2.3", "abc", "1e3", "0.123"])("rejects %j at 2 decimals", (text) => {
    expect(parseAmount(text, 2)).toBeUndefined();
  });
});

describe("arithmetic", () => {
  it("adds, subtracts and compares at the same precision", () => {
    expect(toDecimalString(add(eth("1.5"), eth("0.25")))).toBe("1.750000000000000000");
    expect(compare(sub(eth("1"), eth("2")), eth("0"))).toBe(-1);
  });

  it("refuses to mix precisions", () => {
    expect(() => add(amount(1n, 6), amount(1n, 18))).toThrow(/decimals/);
  });

  it("rescales with half-even rounding", () => {
    expect(rescale(amount(12345n, 4), 2).base).toBe(123n);
    expect(rescale(amount(12355n, 4), 2).base).toBe(124n);
    expect(rescale(amount(5n, 0), 3).base).toBe(5000n);
  });

  it("applies a split ratio exactly", () => {
    expect(mulDiv(amount(10n, 0), 3n, 2n).base).toBe(15n);
  });

  it("values a quantity in cents", () => {
    expect(valueInCents(parseAmount("12.408", 18) ?? eth("0"), usd8("186.84"))).toBe(231831n);
    expect(valueInCents(eth("1.2044"), usd8("3239.88"))).toBe(390211n);
  });

  it.each([-1, 37, 1.5])("rejects %s decimals", (decimals) => {
    expect(() => amount(1n, decimals)).toThrow(RangeError);
  });
});

describe("formatting", () => {
  it.each([
    [4821307n, "negative", "$48,213.07"],
    [61240n, "always", "+$612.40"],
    [-102n, "always", "−$1.02"],
    [-102n, "negative", "−$1.02"],
    [0n, "always", "$0.00"],
  ] as const)("fiat %s (%s) → %s", (cents, sign, text) => {
    expect(formatFiat(cents, sign)).toBe(text);
  });

  it.each([
    [190000000n, "$1.9M"],
    [64000000n, "$640K"],
    [21200n, "$212"],
  ])("compact fiat %s → %s", (cents, text) => {
    expect(formatFiatCompact(cents)).toBe(text);
  });

  it.each([
    ["1.2044", "ETH", "1.2044 ETH"],
    ["8120", "USDG", "8,120 USDG"],
    ["8120.456", "USDG", "8,120.46 USDG"],
    ["0.00031219", "BTC", "0.0003122 BTC"],
    ["-2.5", "NVDA", "−2.5 NVDA"],
  ])("token %s %s → %s", (text, symbol, out) => {
    expect(formatToken(parseAmount(text, 18) ?? eth("0"), symbol)).toBe(out);
  });

  it.each([
    [214n, "+2.14%"],
    [-86n, "−0.86%"],
    [0n, "0.00%"],
  ])("percent %s bps → %s", (bps, text) => {
    expect(formatPercentBps(bps)).toBe(text);
  });

  it("never prints a hyphen-minus", () => {
    expect(formatFiat(-1n) + formatToken(eth("-1"), "ETH") + formatPercentBps(-1n)).not.toContain(
      "-",
    );
  });
});

describe("codec", () => {
  it("round-trips values beyond Number.MAX_SAFE_INTEGER through JSON", () => {
    const big = amount(123456789012345678901234567890n, 18);
    const back = decodeAmount(JSON.parse(JSON.stringify(encodeAmount(big))));
    expect(back).toEqual(big);
  });

  it.each([
    { base: "1.5", decimals: 2 },
    { base: "12", decimals: 99 },
    { base: 12, decimals: 2 },
    null,
  ])("rejects %j", (json) => {
    expect(() => decodeAmount(json)).toThrow();
  });
});

describe("formatPrice", () => {
  const usd = (text: string) => {
    const value = parseAmount(text, 8);
    if (value === undefined) throw new Error(text);
    return value;
  };
  it.each([
    ["186.84", "$186.84"],
    ["112604", "$112,604.00"],
    ["1", "$1.00"],
    ["0", "$0.00"],
    ["0.0019", "$0.0019"],
    ["0.00021234", "$0.0002123"],
    ["0.99985", "$0.9999"],
    ["0.99995", "$1.00"],
    ["0.5", "$0.50"],
  ])("%s → %s", (text, expected) => {
    expect(formatPrice(usd(text))).toBe(expected);
  });
});

describe("formatDecimal", () => {
  it.each([
    [amount(1_000_054_000_000n, 12), "1.000054"],
    [amount(3_000_000_000_000n, 12), "3"],
    [amount(12_408_500n, 3), "12,408.5"],
    [amount(-5n, 2), "−0.05"],
  ])("%o → %s", (value, expected) => {
    expect(formatDecimal(value)).toBe(expected);
  });
});

describe("toPlainDecimal", () => {
  it.each([
    ["1.500000", 6, "1.5"],
    ["2.000000", 6, "2"],
    ["0.000100", 6, "0.0001"],
    ["12", 0, "12"],
    ["-3.10", 2, "-3.1"],
  ])("%s with %i decimals is %s", (text, decimals, expected) => {
    const value = parseAmount(text, decimals);
    expect(value === undefined ? undefined : toPlainDecimal(value)).toBe(expected);
  });
});
