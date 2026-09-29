import { toDecimalString, type Amount } from "./amount";
import { displayCurrencyStore, toDisplayCents, toDisplayPrice } from "./display";

export type SignDisplay = "negative" | "always";

const MINUS = "−";
const LOCALE = "en-US";

// Intl formats exact decimal strings (no float rounding) when given a string.
type ExactFormat = (value: string) => string;
const isDecimal = (value: string): value is `${number}` => /^-?\d+(\.\d+)?$/.test(value);
const cache = new Map<string, ExactFormat>();

function formatter(options: Intl.NumberFormatOptions): ExactFormat {
  const key = JSON.stringify(options);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const nf = new Intl.NumberFormat(LOCALE, options);
  const fn: ExactFormat = (value) => {
    if (!isDecimal(value)) throw new RangeError(`Not a decimal string: ${value}`);
    return nf.format(value).replaceAll("-", MINUS);
  };
  cache.set(key, fn);
  return fn;
}

// "negative" hides the sign of a value that rounds to zero; "exceptZero" shows + and − but never on zero.
const signOption = (sign: SignDisplay) => (sign === "always" ? "exceptZero" : "negative");

function centsToDecimal(cents: bigint): string {
  return toDecimalString({ base: cents, decimals: 2 });
}

/** "$48,213.07", or "+$612.40" / "−$1.02" with sign "always". Never "−$0.00". */
export function formatFiat(cents: bigint, sign: SignDisplay = "negative"): string {
  const currency = displayCurrencyStore.get();
  return formatter({ style: "currency", currency, signDisplay: signOption(sign) })(
    centsToDecimal(toDisplayCents(cents)),
  );
}

/** "$1.9M", "$640K", "$212". For caps and volumes where precision is noise. */
export function formatFiatCompact(cents: bigint): string {
  return formatter({
    style: "currency",
    currency: displayCurrencyStore.get(),
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    signDisplay: "negative",
  })(centsToDecimal(toDisplayCents(cents)));
}

/**
 * Token quantity with precision that fits its size: 2 decimals from 1,000,
 * 4 from 1, and 4 significant digits below 1. "1.2044 ETH", "0.0003121 BTC".
 */
export function formatToken(value: Amount, symbol: string, sign: SignDisplay = "negative"): string {
  const text = toDecimalString(value);
  const magnitude = value.base < 0n ? -value.base : value.base;
  const whole = magnitude / 10n ** BigInt(value.decimals);
  const precision: Intl.NumberFormatOptions =
    whole >= 1000n
      ? { maximumFractionDigits: 2 }
      : whole >= 1n
        ? { maximumFractionDigits: 4 }
        : { maximumSignificantDigits: 4 };
  return `${formatter({ ...precision, signDisplay: signOption(sign) })(text)} ${symbol}`;
}

/** Basis points to percent: 214 → "+2.14%" with sign "always", −86 → "−0.86%". */
export function formatPercentBps(bps: bigint, sign: SignDisplay = "always"): string {
  return formatter({
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signOption(sign),
  })(toDecimalString({ base: bps, decimals: 4 }));
}

/**
 * A unit price in US dollars (an Amount of dollars, e.g. 8 decimals): cents
 * from $1, four significant digits below. "$186.84", "$0.0019".
 */
export function formatPrice(usdPrice: Amount): string {
  const text = toDecimalString(toDisplayPrice(usdPrice));
  const [, fraction = ""] = text.replace("-", "").split(".");
  const whole = text.replace("-", "").startsWith("0") ? 0 : 1;
  // Below $1: keep four digits after the leading zeros, never fewer than two.
  const leadingZeros = fraction.length - fraction.replace(/^0+/, "").length;
  const maximumFractionDigits = whole === 1 ? 2 : Math.max(2, leadingZeros + 4);
  return formatter({
    style: "currency",
    currency: displayCurrencyStore.get(),
    minimumFractionDigits: 2,
    maximumFractionDigits,
  })(text);
}

/** An exact decimal with grouping and no trailing zeros: "1.000054", "3", "12,408.5". */
export function formatDecimal(value: Amount): string {
  return formatter({ maximumFractionDigits: value.decimals })(toDecimalString(value));
}
