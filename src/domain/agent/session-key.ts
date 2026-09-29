import type { AgentRule } from "./rule";

/** A scoped key the user grants the agent for one rule. Revoking it stops everything at once. */
export interface SessionKey {
  readonly rule: AgentRule;
  readonly grantedAt: Date;
  readonly revoked: boolean;
  /** Dollars the agent has spent under this key so far. */
  readonly spentCents: bigint;
}

/** What the agent wants to sign for, reduced to what the key can check. */
export interface AgentAction {
  readonly assetId: string | undefined;
  readonly side: "buy" | "sell" | "rebalance";
  readonly spendCents: bigint;
}

/**
 * Whether the key covers an action: not revoked or expired, the rule's own
 * asset and direction, and within the per-run amount and the total cap.
 * Returns the reason when it doesn't.
 */
export function keyPermits(key: SessionKey, action: AgentAction, now: Date): string | undefined {
  const { rule } = key;
  if (key.revoked) return "The key was revoked.";
  if (now >= rule.expiresAt) return "The key has expired.";
  if (rule.intent === "rebalance") {
    return action.side === "rebalance" ? undefined : "This key only rebalances.";
  }
  if (action.assetId !== rule.assetId) return "This key doesn't cover that asset.";
  if (rule.intent === "take-profit") {
    return action.side === "sell" ? undefined : "This key only sells.";
  }
  if (action.side !== "buy") return "This key only buys.";
  if (action.spendCents > rule.amountCents) return "That's more than the key allows per run.";
  if (key.spentCents + action.spendCents > rule.capCents)
    return "That would pass the key's spend cap.";
  return undefined;
}
