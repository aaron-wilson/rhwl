import { amount, parseAmount, pow10, valueInCents, type Amount } from "../money/amount";

export type Side = "buy" | "sell";
/** Dollars, or units: shares for a Stock Token, tokens for anything else. */
export type OrderUnit = "usd" | "units";

export interface OrderQuote {
  /** Tokens bought or sold. */
  readonly tokens: Amount;
  /** What they are worth at the quoted price, in cents. */
  readonly cents: bigint;
}

/**
 * Turns typed input into an order. Dollars convert at `price` (US dollars per
 * token, 8 decimals), rounded down so a dollar order never overspends. Shares
 * convert through the multiplier (shares per token, any decimals): a token is
 * worth `multiplier` shares, so tokens = shares ÷ multiplier.
 */
export function quoteOrder(
  text: string,
  unit: OrderUnit,
  decimals: number,
  price: Amount,
  multiplier?: Amount,
): OrderQuote | undefined {
  const trimmed = text.trim().replace(/^\$/, "");
  if (unit === "usd") {
    const cents = parseAmount(trimmed, 2);
    if (cents === undefined) return undefined;
    return quoteCents(cents.base, decimals, price);
  }
  const units = parseAmount(trimmed, decimals);
  if (units === undefined || units.base <= 0n) return undefined;
  const tokens =
    multiplier === undefined
      ? units
      : amount((units.base * pow10(multiplier.decimals)) / multiplier.base, decimals);
  if (tokens.base === 0n) return undefined;
  return { tokens, cents: valueInCents(tokens, price) };
}

/**
 * A dollar order of `cents` at `price` (US dollars per token, 8 decimals),
 * rounded down so it never overspends. Undefined when it buys nothing.
 */
export function quoteCents(cents: bigint, decimals: number, price: Amount): OrderQuote | undefined {
  if (cents <= 0n || price.base <= 0n) return undefined;
  const tokens = (cents * pow10(decimals + price.decimals - 2)) / price.base;
  if (tokens === 0n) return undefined;
  const quantity = amount(tokens, decimals);
  return { tokens: quantity, cents: valueInCents(quantity, price) };
}

/** Shares a token amount represents, to 6 decimals. */
export function sharesOf(tokens: Amount, multiplier: Amount): Amount {
  return amount(
    (tokens.base * multiplier.base) / pow10(tokens.decimals + multiplier.decimals - 6),
    6,
  );
}
