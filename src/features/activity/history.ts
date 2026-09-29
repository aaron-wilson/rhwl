import { useSyncExternalStore } from "react";
import { useProviders } from "../../app/providers-context";
import { netEffects } from "../../domain/tx/effects";
import { cachedSource, memoByOwner } from "../../lib/cached-source";
import type { BalanceDelta, Chain, TxSummary } from "../../ports/chain";
import { subscribeToLedger } from "../transactions";
import { txStore } from "../transactions";

export interface ActivityRow {
  readonly key: string;
  readonly summary: TxSummary;
  readonly at: Date;
  readonly status: "pending" | "confirmed" | "failed";
  /** The change worth showing: what arrived if anything did, otherwise what left. */
  readonly headline: BalanceDelta | undefined;
  readonly error: string | undefined;
  /** Every balance change on the account, fee included, merged per asset. */
  readonly effects: readonly BalanceDelta[];
}

const headline = (deltas: readonly BalanceDelta[]) =>
  deltas.find((d) => d.quantity.base > 0n) ?? deltas.find((d) => d.quantity.base !== 0n);

function rows(chain: Chain, account: string): readonly ActivityRow[] {
  // Signed but not yet accepted by the network: only the wallet knows about these.
  const broadcasting = txStore
    .get()
    .filter((tx) => tx.account === account && tx.machine.state === "submitted")
    .map((tx) => ({
      key: `local-${tx.id}`,
      summary: tx.request.summary,
      at: tx.machine.log.at(-1)?.at ?? new Date(0),
      status: "pending" as const,
      headline: headline(tx.request.deltas),
      error: undefined,
      effects: netEffects(tx.request),
    }));
  const onChain = chain.history(account).map((tx) => ({
    key: tx.hash,
    summary: tx.request.summary,
    at: tx.settledAt ?? tx.submittedAt,
    status: tx.status,
    headline: headline(tx.request.deltas),
    error: tx.error,
    effects: netEffects(tx.request),
  }));
  return [...broadcasting, ...onChain].sort((a, b) => b.at.getTime() - a.at.getTime());
}

const sourceFor = memoByOwner((chain: Chain, account: string) =>
  cachedSource(
    (listener) => subscribeToLedger(chain, listener),
    () => rows(chain, account),
    (value) => value.map((row) => `${row.key}:${row.status}`).join(","),
  ),
);

/** Everything the account has done, newest first, including what is still broadcasting. */
export function useActivity(account: string): readonly ActivityRow[] {
  const source = sourceFor(useProviders().chain, account);
  return useSyncExternalStore(source.subscribe, source.getSnapshot);
}
