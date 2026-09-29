import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assessApproval } from "../../domain/approvals/risk";
import { securityChecks, type SecurityCheck } from "../../domain/security/checks";
import { poisonedSenders, type PoisonedSender } from "../../domain/security/poison";
import { createStore, useStore } from "../../lib/store";
import { useActiveAccountEntry } from "../accounts";
import { useApprovals } from "../approvals";
import { useGuardrails } from "../guardrails";
import { useAutoLock } from "../lock";
import { useHoldings } from "../transactions";

/** Accounts whose backup was proved by a signature this session. */
export const backupVerifiedStore = createStore<readonly string[]>([]);
/** Lookalike addresses the user has marked as scams. */
export const flaggedStore = createStore<readonly string[]>([]);

export interface SecurityState {
  readonly checks: readonly SecurityCheck[];
  readonly risky: ReturnType<typeof useApprovals>;
  readonly poison: readonly PoisonedSender[];
}

/** Gathers the facts about the active account and runs the checklist over them. */
export function useSecurity(account: string): SecurityState {
  const { chain } = useProviders();
  useHoldings(account); // re-render when the ledger moves, so history is current
  const now = useNow(60_000);
  const entry = useActiveAccountEntry();
  const verified = useStore(backupVerifiedStore);
  const flagged = useStore(flaggedStore);
  const risky = useApprovals(account).filter((a) => assessApproval(a, now).risk !== "ok");
  const poison = poisonedSenders(chain.history(account)).filter(
    (p) => !flagged.includes(p.address),
  );
  const checks = securityChecks({
    backupVerified: verified.includes(account),
    signer: entry?.kind ?? "watch",
    autoLock: useAutoLock() !== "never",
    guardrails: Object.keys(useGuardrails()).length > 0,
    riskyApprovals: risky.length,
    unflaggedPoison: poison.length,
  });
  return { checks, risky, poison };
}
