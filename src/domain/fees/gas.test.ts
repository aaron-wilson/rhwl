import { describe, expect, it } from "vitest";
import { amount, parseAmount, toDecimalString, type Amount } from "../money/amount";
import { ethFeeAt, feeInToken } from "./gas";

const q = (text: string, decimals: number): Amount => parseAmount(text, decimals) ?? amount(0n, 0);
const base = q("0.000004", 18);

describe("ethFeeAt", () => {
  it.each([
    ["slow", "0.0000032"],
    ["standard", "0.000004"],
    ["fast", "0.000006"],
  ] as const)("%s → %s ETH", (speed, expected) => {
    expect(toDecimalString(ethFeeAt(base, speed)).replace(/0+$/, "")).toBe(expected);
  });
});

describe("feeInToken", () => {
  it("converts at market with a 10% paymaster premium, rounding up", () => {
    // 0.000004 ETH at $3,000 is $0.012; plus 10% is $0.0132; at $1 that is 0.0132 USDG.
    expect(toDecimalString(feeInToken(base, q("3000", 8), q("1", 8), 6))).toBe("0.013200");
    // At $200 per NVDA token, $0.0132 is 0.000066 NVDA.
    expect(toDecimalString(feeInToken(base, q("3000", 8), q("200", 8), 18))).toBe(
      "0.000066000000000000",
    );
  });

  it("never rounds a fee down to nothing", () => {
    expect(feeInToken(amount(1n, 18), q("3000", 8), q("1", 8), 6).base).toBe(1n);
  });
});
