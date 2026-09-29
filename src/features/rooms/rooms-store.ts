import { createStore, useStore } from "../../lib/store";

/** Rooms each account has proven it can enter, as "account:ticker". Session state. */
export const joinedStore = createStore<readonly string[]>([]);

export const roomKey = (account: string, ticker: string) => `${account}:${ticker}`;

export function useJoined(account: string, ticker: string): boolean {
  return useStore(joinedStore, (keys) => keys.includes(roomKey(account, ticker)));
}

export function markJoined(account: string, ticker: string): void {
  joinedStore.set((keys) => [...keys, roomKey(account, ticker)]);
}
