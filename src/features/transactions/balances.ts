import { useSyncExternalStore } from "react";
import { useProviders } from "../../app/providers-context";
import { applyDeltas, netEffects } from "../../domain/tx/effects";
import { isInFlight } from "../../domain/tx/machine";
import type { Chain, Holding } from "../../ports/chain";
import { cachedSource, memoByOwner } from "../../lib/cached-source";
import { txStore } from "./tx-store";

/** Confirmed balances plus the effects of everything still in flight. */
export function optimisticHoldings(
  confirmed: readonly Holding[],
  account: string,
): readonly Holding[] {
  const inFlight = txStore
    .get()
    .filter((tx) => tx.account === account && isInFlight(tx.machine.state));
  return applyDeltas(
    confirmed,
    inFlight.flatMap((tx) => netEffects(tx.request)),
  );
}

/** Listens to everything that can change what an account sees: the chain and in-flight transactions. */
export function subscribeToLedger(chain: Chain, listener: () => void): () => void {
  const offChain = chain.subscribe(listener);
  const offTx = txStore.subscribe(listener);
  return () => {
    offChain();
    offTx();
  };
}

/** One cached source per chain and account, returning the same array until a balance changes. */
const sourceFor = memoByOwner((chain: Chain, account: string) =>
  cachedSource(
    (listener) => subscribeToLedger(chain, listener),
    () => optimisticHoldings(chain.balances(account), account),
    (value) => value.map((h) => `${h.assetId}=${h.quantity.base.toString()}`).join(","),
  ),
);

/** What the user should see right now: optimistic while in flight, rolled back on failure. */
export function useHoldings(account: string): readonly Holding[] {
  const source = sourceFor(useProviders().chain, account);
  return useSyncExternalStore(source.subscribe, source.getSnapshot);
}
