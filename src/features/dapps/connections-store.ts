import type { DappPermission } from "../../data/dapps";
import type { ChainId } from "../../data/types";
import { createStore, useStore } from "../../lib/store";

/** A site the user let in: which account it sees, on which network, allowed to do what. */
export interface Connection {
  readonly dappId: string;
  readonly account: string;
  readonly chain: ChainId;
  readonly permissions: readonly DappPermission[];
  readonly connectedAt: Date;
}

/** Session state: Reset demo disconnects every site. */
export const connectionsStore = createStore<readonly Connection[]>([]);

/** Connects a site, replacing any earlier connection it had. */
export function connectDapp(connection: Connection): void {
  connectionsStore.set((list) => [
    ...list.filter((c) => c.dappId !== connection.dappId),
    connection,
  ]);
}

export function disconnectDapp(dappId: string): void {
  connectionsStore.set((list) => list.filter((c) => c.dappId !== dappId));
}

export function disconnectAll(): void {
  connectionsStore.set([]);
}

/** Lookalike sites the user chose to enter anyway, this session. */
export const proceededStore = createStore<readonly string[]>([]);
export const useProceeded = () => useStore(proceededStore);

export const useConnections = () => useStore(connectionsStore);

export function useConnection(dappId: string): Connection | undefined {
  return useConnections().find((c) => c.dappId === dappId);
}
