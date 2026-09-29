import { divRound, valueInCents, type Amount } from "../money/amount";

export interface Position {
  readonly assetId: string;
  readonly quantity: Amount;
}

/** Total value in cents of positions at the given prices. Missing prices count as zero. */
export function totalCents(
  positions: readonly Position[],
  priceOf: (assetId: string) => Amount | undefined,
): bigint {
  return positions.reduce((sum, p) => {
    const price = priceOf(p.assetId);
    return price === undefined ? sum : sum + valueInCents(p.quantity, price);
  }, 0n);
}

/** Adds per-asset value series point by point. Every series must have the same length. */
export function sumSeries(series: readonly (readonly bigint[])[]): bigint[] {
  const length = series[0]?.length ?? 0;
  return Array.from({ length }, (_, i) => series.reduce((sum, s) => sum + (s[i] ?? 0n), 0n));
}

export interface Change {
  readonly cents: bigint;
  /** Basis points; 0 when the starting value is 0. */
  readonly bps: bigint;
}

export function changeBetween(from: bigint, to: bigint): Change {
  return { cents: to - from, bps: from === 0n ? 0n : divRound((to - from) * 10_000n, from) };
}
