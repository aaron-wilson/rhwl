import { amount, parseAmount, pow10, type Amount } from "../money/amount";

/**
 * A pump-style bonding curve: a constant-product pool against virtual
 * reserves. 800M of the token's 1B supply sell on the curve; when they are
 * gone the token graduates to an ordinary pool. Dollars carry 8 decimals and
 * tokens 18, so every step is exact integer math.
 */
const TOKEN = pow10(18);
export const VIRTUAL_TOKENS = 1_073_000_000n * TOKEN;
export const CURVE_SUPPLY = 800_000_000n * TOKEN;
/** The launchpad's cut of every curve trade, in basis points. */
export const CURVE_FEE_BPS = 100n;

export interface Curve {
  /** The virtual dollar reserve at launch (8 decimals); sets the curve's price level. */
  readonly virtualUsd: bigint;
  /** Tokens sold so far (18 decimals). */
  readonly sold: bigint;
}

const k = (c: Curve) => c.virtualUsd * VIRTUAL_TOKENS;
const tokenReserve = (c: Curve) => VIRTUAL_TOKENS - c.sold;
const usdReserve = (c: Curve) => k(c) / tokenReserve(c);

/**
 * The curve whose price at `progressBps` equals `priceUsd` (8 decimals), so a
 * seeded launch starts where the catalog prices it. price = V·T₀ / (T₀ − sold)².
 */
export function curveFor(priceUsd: Amount, progressBps: number): Curve {
  const sold = (CURVE_SUPPLY * BigInt(progressBps)) / 10_000n;
  const left = VIRTUAL_TOKENS - sold;
  return { virtualUsd: (priceUsd.base * left * left) / (VIRTUAL_TOKENS * TOKEN), sold };
}

/** Dollars per whole token, 8 decimals. */
export function curvePrice(c: Curve): Amount {
  return amount((usdReserve(c) * TOKEN) / tokenReserve(c), 8);
}

export function progressBps(c: Curve): number {
  return Number((c.sold * 10_000n) / CURVE_SUPPLY);
}

export const isGraduated = (c: Curve): boolean => c.sold >= CURVE_SUPPLY;

export interface CurveTrade {
  readonly curve: Curve;
  readonly tokens: Amount;
  /** Dollars actually spent (a buy) or received (a sell), 8 decimals. */
  readonly usd: Amount;
  /** Dollars not spent because the curve filled, 8 decimals. */
  readonly refund: Amount;
  readonly graduated: boolean;
}

const withFee = (usd: bigint) => (usd * (10_000n - CURVE_FEE_BPS)) / 10_000n;

/**
 * Buys with `usdIn` (8 decimals). A buy that would take more than the curve
 * has left fills it exactly, spends only what that costs, and graduates.
 */
export function buyOnCurve(c: Curve, usdIn: Amount): CurveTrade {
  if (isGraduated(c) || usdIn.base <= 0n) {
    return {
      curve: c,
      tokens: amount(0n, 18),
      usd: amount(0n, 8),
      refund: usdIn,
      graduated: isGraduated(c),
    };
  }
  const net = withFee(usdIn.base);
  const out = tokenReserve(c) - k(c) / (usdReserve(c) + net);
  const room = CURVE_SUPPLY - c.sold;
  if (out < room) {
    const curve = { ...c, sold: c.sold + out };
    return { curve, tokens: amount(out, 18), usd: usdIn, refund: amount(0n, 8), graduated: false };
  }
  // Fill the curve: the net dollars that take the reserve to its final level, grossed up for the fee.
  const netNeeded = k(c) / (VIRTUAL_TOKENS - CURVE_SUPPLY) - usdReserve(c);
  const gross = (netNeeded * 10_000n + (10_000n - CURVE_FEE_BPS) - 1n) / (10_000n - CURVE_FEE_BPS);
  const spent = gross < usdIn.base ? gross : usdIn.base;
  return {
    curve: { ...c, sold: CURVE_SUPPLY },
    tokens: amount(room, 18),
    usd: amount(spent, 8),
    refund: amount(usdIn.base - spent, 8),
    graduated: true,
  };
}

/** Sells `tokensIn` back into the curve; never more than it has sold. */
export function sellOnCurve(c: Curve, tokensIn: Amount): CurveTrade {
  const tokens = tokensIn.base > c.sold ? c.sold : tokensIn.base;
  const before = usdReserve(c);
  const after = k(c) / (tokenReserve(c) + tokens);
  const curve = { ...c, sold: c.sold - tokens };
  return {
    curve,
    tokens: amount(tokens, 18),
    usd: amount(withFee(before - after), 8),
    refund: amount(0n, 8),
    graduated: false,
  };
}

/** "0.00064" → 8-decimal dollars. */
export const usd8 = (text: string): Amount => parseAmount(text, 8) ?? amount(0n, 8);
