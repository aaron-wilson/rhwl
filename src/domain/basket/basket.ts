import { divRound } from "../money/amount";

/** One member of a basket and its target share, in basis points. */
export interface Weight {
  readonly assetId: string;
  readonly bps: number;
}

export const FULL_BPS = 10_000;
export const MAX_MEMBERS = 8;

/** An even split in whole basis points; the last member takes the remainder. */
export function evenSplit(ids: readonly string[]): Weight[] {
  const each = Math.floor(FULL_BPS / ids.length);
  return ids.map((assetId, i) => ({
    assetId,
    bps: i === ids.length - 1 ? FULL_BPS - each * (ids.length - 1) : each,
  }));
}

/** Why a set of weights can't be bought; an empty list means it can. */
export function weightProblems(weights: readonly Weight[]): string[] {
  const problems: string[] = [];
  if (weights.length === 0) problems.push("Add at least one asset.");
  if (weights.length > MAX_MEMBERS) problems.push(`A basket holds at most ${MAX_MEMBERS} assets.`);
  if (new Set(weights.map((w) => w.assetId)).size !== weights.length) {
    problems.push("Each asset can appear only once.");
  }
  if (weights.some((w) => !Number.isInteger(w.bps) || w.bps <= 0)) {
    problems.push("Every weight must be above 0%.");
  }
  const total = weights.reduce((sum, w) => sum + w.bps, 0);
  if (weights.length > 0 && total !== FULL_BPS) {
    problems.push(`Weights add up to ${(total / 100).toFixed(2)}%, not 100%.`);
  }
  return problems;
}

/**
 * Splits `totalCents` by weight, each leg rounded down; the last leg takes the
 * remainder, so the legs always add up to the total exactly.
 */
export function allocate(totalCents: bigint, weights: readonly Weight[]): readonly bigint[] {
  const shares = weights.map((w) => (totalCents * BigInt(w.bps)) / BigInt(FULL_BPS));
  const spent = shares.slice(0, -1).reduce((sum, c) => sum + c, 0n);
  return shares.map((c, i) => (i === shares.length - 1 ? totalCents - spent : c));
}

/** Each member's share of the basket's current value, in basis points. */
export function currentBps(valuesCents: readonly bigint[]): readonly number[] {
  const total = valuesCents.reduce((sum, c) => sum + c, 0n);
  if (total === 0n) return valuesCents.map(() => 0);
  return valuesCents.map((c) => Number(divRound(c * BigInt(FULL_BPS), total)));
}

/** The largest gap between a member's current and target share, in basis points. */
export function maxDriftBps(valuesCents: readonly bigint[], weights: readonly Weight[]): number {
  const now = currentBps(valuesCents);
  return weights.reduce((max, w, i) => Math.max(max, Math.abs((now[i] ?? 0) - w.bps)), 0);
}

/** Drift worth suggesting a rebalance for. */
export const REBALANCE_AT_BPS = 500;

/**
 * Dollars to move per member to return to target: positive buys, negative
 * sells. The changes sum to zero, so a rebalance needs no new cash.
 */
export function rebalanceCents(
  valuesCents: readonly bigint[],
  weights: readonly Weight[],
): readonly bigint[] {
  const total = valuesCents.reduce((sum, c) => sum + c, 0n);
  const targets = allocate(total, weights);
  return targets.map((target, i) => target - (valuesCents[i] ?? 0n));
}
