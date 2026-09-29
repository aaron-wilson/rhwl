import {
  initialTx,
  isInFlight,
  transition,
  type TxEvent,
  type TxMachine,
} from "../../domain/tx/machine";
import { createStore, useStore } from "../../lib/store";
import type { TxRequest } from "../../ports/chain";
import type { SimulationResult } from "../../ports/simulation";

/** A transaction as the wallet sees it: the request, its dry run and its lifecycle. */
export interface WalletTx {
  readonly id: number;
  readonly account: string;
  readonly request: TxRequest;
  readonly simulation: SimulationResult | undefined;
  readonly machine: TxMachine;
}

export const txStore = createStore<readonly WalletTx[]>([]);
let nextId = 1;

export function createTx(account: string, request: TxRequest): number {
  const id = nextId;
  nextId += 1;
  txStore.set((txs) => [
    { id, account, request, simulation: undefined, machine: initialTx },
    ...txs,
  ]);
  return id;
}

export function updateTx(id: number, change: (tx: WalletTx) => WalletTx): void {
  txStore.set((txs) => txs.map((tx) => (tx.id === id ? change(tx) : tx)));
}

/** Moves a transaction through the state machine. Illegal events throw. */
export function dispatchTx(id: number, event: TxEvent, at: Date): void {
  updateTx(id, (tx) => ({ ...tx, machine: transition(tx.machine, event, at) }));
}

export function findTx(id: number): WalletTx | undefined {
  return txStore.get().find((tx) => tx.id === id);
}

export function useTxs(): readonly WalletTx[] {
  return useStore(txStore);
}

export function useInFlight(): readonly WalletTx[] {
  const txs = useTxs();
  return txs.filter((tx) => isInFlight(tx.machine.state));
}
