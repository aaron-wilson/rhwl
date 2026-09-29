import { useMemo } from "react";
import { VAULT_CONTRACT } from "../../data/earn";
import { emptyVault, vaultMove, type VaultPosition } from "../../domain/earn/vault";
import { amount, type Amount } from "../../domain/money/amount";
import { createStore, useStore } from "../../lib/store";
import type { Providers } from "../../ports/providers";
import { NETWORK_FEE } from "../transactions/actions";
import { runTransaction } from "../transactions/actions";

interface VaultState {
  readonly positions: Readonly<Record<string, VaultPosition>>;
  /** Whether the risk disclosure has been read and accepted this session. */
  readonly acknowledged: boolean;
}

export const vaultStore = createStore<VaultState>({ positions: {}, acknowledged: false });

export function acknowledgeRisks(): void {
  vaultStore.set((state) => ({ ...state, acknowledged: true }));
}

export function useVault(account: string): {
  position: VaultPosition | undefined;
  acknowledged: boolean;
} {
  const state = useStore(vaultStore);
  return useMemo(
    () => ({ position: state.positions[account], acknowledged: state.acknowledged }),
    [state, account],
  );
}

type Deps = Pick<Providers, "clock" | "chain" | "simulation">;
const USDG = "rh:USDG";

/**
 * Moves USDG into (positive) or out of (negative) the vault through a signed
 * transaction; the vault position changes once it confirms.
 */
export async function moveVault(deps: Deps, account: string, change: Amount): Promise<boolean> {
  const into = change.base > 0n;
  const walletDelta = amount(-change.base, change.decimals);
  const tx = await runTransaction(deps, account, {
    kind: "contract",
    summary: {
      verb: into ? "Deposited" : "Withdrew",
      primary: { assetId: USDG, quantity: walletDelta },
      detail: into ? "to the USDG vault" : "from the USDG vault",
    },
    deltas: [{ assetId: USDG, quantity: walletDelta }],
    fee: NETWORK_FEE,
    to: VAULT_CONTRACT,
  });
  if (tx.machine.state !== "confirmed") return false;
  const now = deps.clock.now();
  vaultStore.set((state) => ({
    ...state,
    positions: {
      ...state.positions,
      [account]: vaultMove(state.positions[account] ?? emptyVault(6, now), change, now),
    },
  }));
  return true;
}
