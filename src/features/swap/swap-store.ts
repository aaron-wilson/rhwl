import { createStore, useStore } from "../../lib/store";

const MAX_RECENTS = 4;

/** Assets picked recently in the swap token picker, newest first. */
export const recentSwapAssets = createStore<readonly string[]>([]);

export function rememberSwapAsset(id: string): void {
  recentSwapAssets.set((list) => [id, ...list.filter((x) => x !== id)].slice(0, MAX_RECENTS));
}

export const useRecentSwapAssets = () => useStore(recentSwapAssets);
