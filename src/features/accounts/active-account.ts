import { createStore, useStore } from "../../lib/store";
import { accountsStore, findAccount, setAccountHidden, type AccountEntry } from "./accounts-store";

const first = accountsStore.get()[0]?.id;
if (first === undefined) throw new Error("The account catalog is empty");

/** Which account every screen is showing. Features read this; nothing passes a literal id. */
export const activeAccountStore = createStore(first);

export function setActiveAccount(id: string): void {
  if (findAccount(id) === undefined) throw new Error(`Unknown account ${id}`);
  activeAccountStore.set(id);
}

/** Hides an account; if it was active, the first visible account becomes active. */
export function hideAccount(id: string): void {
  setAccountHidden(id, true);
  if (activeAccountStore.get() === id) {
    const next = accountsStore.get().find((a) => !a.hidden);
    if (next !== undefined) activeAccountStore.set(next.id);
  }
}

export function useActiveAccount(): string {
  return useStore(activeAccountStore);
}

export function useActiveAccountEntry(): AccountEntry | undefined {
  const id = useActiveAccount();
  return useStore(accountsStore, (list) => list.find((a) => a.id === id));
}
