import { accounts, type Account } from "../../data/accounts";
import { createStore, useStore } from "../../lib/store";

export interface AccountEntry extends Account {
  readonly hidden: boolean;
}

/** The wallet's accounts, in the user's order. Session state: Reset demo restores the catalog. */
export const accountsStore = createStore<readonly AccountEntry[]>(
  accounts.map((a) => ({ ...a, hidden: false })),
);

export const MAX_NAME = 24;

function update(id: string, change: (entry: AccountEntry) => AccountEntry): void {
  if (!accountsStore.get().some((a) => a.id === id)) throw new Error(`Unknown account ${id}`);
  accountsStore.set((list) => list.map((a) => (a.id === id ? change(a) : a)));
}

export function findAccount(id: string): AccountEntry | undefined {
  return accountsStore.get().find((a) => a.id === id);
}

/** Renames an account. Names are trimmed and must be 1 to 24 characters. */
export function renameAccount(id: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME) {
    throw new RangeError(`An account name is 1 to ${MAX_NAME} characters`);
  }
  update(id, (a) => ({ ...a, name: trimmed }));
}

/** Moves an account one place up (-1) or down (1). Moving past either end does nothing. */
export function moveAccount(id: string, direction: -1 | 1): void {
  const list = [...accountsStore.get()];
  const from = list.findIndex((a) => a.id === id);
  const to = from + direction;
  const moving = list[from];
  if (from === -1 || to < 0 || to >= list.length || moving === undefined) return;
  list.splice(from, 1);
  list.splice(to, 0, moving);
  accountsStore.set(list);
}

/** Hides or shows an account. The last visible account cannot be hidden. */
export function setAccountHidden(id: string, hidden: boolean): void {
  const visible = accountsStore.get().filter((a) => !a.hidden);
  if (hidden && visible.length === 1 && visible[0]?.id === id) {
    throw new Error("At least one account must stay visible");
  }
  update(id, (a) => ({ ...a, hidden }));
}

export function addAccount(account: Account): void {
  if (findAccount(account.id) !== undefined) return;
  accountsStore.set((list) => [...list, { ...account, hidden: false }]);
}

export const useAccounts = () => useStore(accountsStore);
