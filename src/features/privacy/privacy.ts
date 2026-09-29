import { createStore, useStore } from "../../lib/store";

export const balancesHiddenStore = createStore(false, "preference");

export function setBalancesHidden(next: boolean): void {
  balancesHiddenStore.set(next);
}

export function toggleBalancesHidden(): void {
  balancesHiddenStore.set((hidden) => !hidden);
}

export function useBalancesHidden(): boolean {
  return useStore(balancesHiddenStore);
}
