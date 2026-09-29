import { knownAddresses } from "../../data/accounts";
import type { Approval } from "../../data/approvals";

export type ApprovalRisk = "danger" | "warning" | "ok";

export interface ApprovalAssessment {
  readonly risk: ApprovalRisk;
  /** Why, in the order they matter. Empty when there is nothing to say. */
  readonly reasons: readonly string[];
}

const DAY_MS = 86_400_000;
/** An allowance left open this long has usually outlived its purpose. */
export const STALE_DAYS = 180;

/** Whole days since the approval was granted. */
export function approvalAgeDays(approval: Approval, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - approval.grantedAt.getTime()) / DAY_MS));
}

/**
 * How much an approval should worry its owner, and why. A drainer is danger;
 * an unverified spender, or an unlimited grant left for half a year, is a
 * warning. Pure: the time is passed in.
 */
export function assessApproval(approval: Approval, now: Date): ApprovalAssessment {
  const spender = approval.spender.toLowerCase();
  const drainer = knownAddresses.drainers.has(spender);
  const unverified = !knownAddresses.verifiedContracts.has(spender);
  const unlimited = approval.allowance === "unlimited";
  const age = approvalAgeDays(approval, now);
  const stale = age >= STALE_DAYS;
  const reasons = [
    drainer ? "Spender has drained other wallets" : undefined,
    unverified ? "Spender's contract is not verified" : undefined,
    unlimited ? "Unlimited amount" : undefined,
    stale ? `Unused for ${age} days` : undefined,
  ].filter((reason) => reason !== undefined);
  const risk: ApprovalRisk = drainer
    ? "danger"
    : unverified || (unlimited && stale)
      ? "warning"
      : "ok";
  return { risk, reasons };
}

const order: Record<ApprovalRisk, number> = { danger: 0, warning: 1, ok: 2 };

/** Riskiest first, then newest. */
export function byRisk(now: Date) {
  return (a: Approval, b: Approval): number =>
    order[assessApproval(a, now).risk] - order[assessApproval(b, now).risk] ||
    b.grantedAt.getTime() - a.grantedAt.getTime();
}
