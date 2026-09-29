import { amount, pow10, type Amount } from "../money/amount";

export type Speed = "slow" | "standard" | "fast";

/** Fee multiplier (percent) and typical wait for each speed. */
export const speeds: Readonly<
  Record<Speed, { readonly percent: number; readonly seconds: number }>
> = {
  slow: { percent: 80, seconds: 30 },
  standard: { percent: 100, seconds: 12 },
  fast: { percent: 150, seconds: 4 },
};

/** The paymaster's markup for accepting a token other than ETH, in basis points. */
export const PAYMASTER_PREMIUM_BPS = 1_000n;

/** The ETH fee at a speed, rounded up so the network is never underpaid. */
export function ethFeeAt(base: Amount, speed: Speed): Amount {
  const percent = BigInt(speeds[speed].percent);
  return amount((base.base * percent + 99n) / 100n, base.decimals);
}

/**
 * The same fee paid in another token through a paymaster: its dollar value,
 * plus the premium, converted at the token's price and rounded up.
 * Prices are US dollars per whole token with 8 decimals.
 */
export function feeInToken(
  ethFee: Amount,
  ethPrice: Amount,
  tokenPrice: Amount,
  tokenDecimals: number,
): Amount {
  const numerator =
    ethFee.base * ethPrice.base * (10_000n + PAYMASTER_PREMIUM_BPS) * pow10(tokenDecimals);
  const denominator = pow10(ethFee.decimals) * tokenPrice.base * 10_000n;
  return amount((numerator + denominator - 1n) / denominator, tokenDecimals);
}

export const speedOrder: readonly Speed[] = ["slow", "standard", "fast"];
