import { createStore, useStore } from "../../lib/store";
import type { TxSummary } from "../../ports/chain";

export type InboxKind = "fill" | "bridge" | "agent" | "earnings" | "market" | "alert";

/** One notification. Amounts stay in `summary` as data, so hidden balances stay hidden. */
export interface InboxItem {
  readonly id: number;
  readonly kind: InboxKind;
  readonly at: Date;
  /** The headline as a transaction summary, when there is one. */
  readonly summary: TxSummary | undefined;
  /** The headline in words, when there is no summary. Never contains an amount. */
  readonly title: string;
  readonly detail: string | undefined;
  /** Where tapping it goes. */
  readonly to: string | undefined;
  readonly read: boolean;
}

/** Session state: Reset demo empties the inbox. */
export const inboxStore = createStore<readonly InboxItem[]>([]);
let nextId = 1;

/** Adds a notification at the top. */
export function notify(
  item: Omit<InboxItem, "id" | "read" | "summary" | "detail" | "to"> &
    Partial<Pick<InboxItem, "summary" | "detail" | "to">>,
): void {
  const entry: InboxItem = {
    summary: undefined,
    detail: undefined,
    to: undefined,
    ...item,
    id: nextId++,
    read: false,
  };
  inboxStore.set((list) => [entry, ...list]);
}

export function markAllRead(): void {
  inboxStore.set((list) => list.map((i) => (i.read ? i : { ...i, read: true })));
}

export const useInbox = () => useStore(inboxStore);
export const useUnread = () => useInbox().filter((i) => !i.read).length;
