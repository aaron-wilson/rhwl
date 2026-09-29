/** A token quantity: an integer count of base units plus the token's decimals. Never a float. */
export interface Amount {
  readonly base: bigint;
  readonly decimals: number;
}

export type Rounding = "half-even" | "down";

const MAX_DECIMALS = 36;
const TEN = 10n;

export function amount(base: bigint, decimals: number): Amount {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
    throw new RangeError(`decimals must be an integer from 0 to ${MAX_DECIMALS}, got ${decimals}`);
  }
  return { base, decimals };
}

export const pow10 = (exponent: number): bigint => TEN ** BigInt(exponent);

/** Integer division with explicit rounding. Half-even avoids drift when many values are summed. */
export function divRound(
  numerator: bigint,
  denominator: bigint,
  rounding: Rounding = "half-even",
): bigint {
  if (denominator === 0n) throw new RangeError("Division by zero");
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  let q = n / d;
  const r = n % d;
  if (rounding === "half-even" && (r * 2n > d || (r * 2n === d && q % 2n === 1n))) q += 1n;
  return negative ? -q : q;
}

/**
 * Parses user-typed decimal text ("1,204.5", "0.25") exactly. Returns undefined
 * for anything that is not a plain decimal or has more fraction digits than the token allows.
 */
export function parseAmount(text: string, decimals: number): Amount | undefined {
  const clean = text.trim().replaceAll(",", "");
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(clean);
  if (match === null || clean === "" || clean === "-" || clean === "." || clean === "-.")
    return undefined;
  const [, sign = "", whole = "", fraction = ""] = match;
  if (fraction.length > decimals) return undefined;
  const digits = `${whole || "0"}${fraction.padEnd(decimals, "0")}`;
  const base = BigInt(digits);
  return amount(sign === "-" ? -base : base, decimals);
}

/** Exact decimal text with every fraction digit, e.g. "1.204400000000000000". */
export function toDecimalString(value: Amount): string {
  const negative = value.base < 0n;
  const digits = (negative ? -value.base : value.base).toString().padStart(value.decimals + 1, "0");
  const whole = digits.slice(0, digits.length - value.decimals);
  const fraction = digits.slice(digits.length - value.decimals);
  return `${negative ? "-" : ""}${whole}${value.decimals > 0 ? `.${fraction}` : ""}`;
}

/** Cents as USDG, the dollar stablecoin: 6 decimals, one dollar each. */
export const centsToUsdg = (cents: bigint): Amount => amount(cents * pow10(4), 6);

/** Like toDecimalString, without trailing zeros: "1.50" → "1.5", "2.00" → "2". For inputs and links. */
export function toPlainDecimal(value: Amount): string {
  return toDecimalString(value)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function same(a: Amount, b: Amount): void {
  if (a.decimals !== b.decimals) {
    throw new RangeError(`Cannot combine amounts with ${a.decimals} and ${b.decimals} decimals`);
  }
}

export function add(a: Amount, b: Amount): Amount {
  same(a, b);
  return amount(a.base + b.base, a.decimals);
}

export function sub(a: Amount, b: Amount): Amount {
  same(a, b);
  return amount(a.base - b.base, a.decimals);
}

export function compare(a: Amount, b: Amount): -1 | 0 | 1 {
  same(a, b);
  return a.base < b.base ? -1 : a.base > b.base ? 1 : 0;
}

/** Re-expresses an amount at a different precision, rounding when precision is lost. */
export function rescale(value: Amount, decimals: number, rounding: Rounding = "half-even"): Amount {
  const shift = decimals - value.decimals;
  if (shift >= 0) return amount(value.base * pow10(shift), decimals);
  return amount(divRound(value.base, pow10(-shift), rounding), decimals);
}

/** Multiplies by a rational factor, e.g. a split ratio or a basis-point fee. */
export function mulDiv(
  value: Amount,
  numerator: bigint,
  denominator: bigint,
  rounding: Rounding = "half-even",
): Amount {
  return amount(divRound(value.base * numerator, denominator, rounding), value.decimals);
}

/**
 * Fiat value in integer cents: quantity × price, where price is US dollars per
 * whole token expressed as an Amount (for example 8 decimals).
 */
export function valueInCents(quantity: Amount, price: Amount): bigint {
  return divRound(quantity.base * price.base, pow10(quantity.decimals + price.decimals - 2));
}
