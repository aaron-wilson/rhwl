import { assetById } from "../../data/assets";
import { startingApprovals, type Approval } from "../../data/approvals";
import { chainName } from "../../data/chains";
import { shortAddress } from "../../domain/keys/address";
import { createStore, useStore } from "../../lib/store";
import type { TxRequest } from "../../ports/chain";
import type { Providers } from "../../ports/providers";
import { NETWORK_FEE, runTransaction } from "../transactions/actions";

/** Every allowance the wallet's accounts have granted. Session state: Reset demo restores the seed. */
export const approvalsStore = createStore<readonly Approval[]>(startingApprovals);

const sameGrant = (a: Approval, b: Approval) =>
  a.account === b.account &&
  a.chain === b.chain &&
  a.assetId === b.assetId &&
  a.spender === b.spender;

/** Records a confirmed approval, replacing an earlier grant to the same spender. */
export function recordApproval(approval: Approval): void {
  approvalsStore.set((list) => [...list.filter((a) => !sameGrant(a, approval)), approval]);
}

export function useApprovals(account: string): readonly Approval[] {
  return useStore(approvalsStore).filter((a) => a.account === account);
}

export const spenderLabel = (a: Approval) => a.spenderName ?? shortAddress(a.spender);

/** One signature that sets every selected allowance to zero, a leg per approval. */
export function revokeRequest(approvals: readonly Approval[]): TxRequest {
  const n = approvals.length;
  return {
    kind: "approve",
    summary: { verb: n === 1 ? "Revoke 1 approval" : `Revoke ${n} approvals` },
    deltas: [],
    fee: NETWORK_FEE,
    legs: approvals.map((a) => ({
      summary: {
        verb: `Revoke ${assetById(a.assetId).symbol}`,
        detail: `for ${spenderLabel(a)} on ${chainName(a.chain)}`,
      },
      deltas: [],
    })),
  };
}

/** Revokes the approvals through the transaction lifecycle; rows go only once it confirms. */
export async function revokeApprovals(
  providers: Providers,
  account: string,
  approvals: readonly Approval[],
): Promise<boolean> {
  const tx = await runTransaction(providers, account, revokeRequest(approvals));
  if (tx.machine.state !== "confirmed") return false;
  const ids = new Set(approvals.map((a) => a.id));
  approvalsStore.set((list) => list.filter((a) => !ids.has(a.id)));
  return true;
}
