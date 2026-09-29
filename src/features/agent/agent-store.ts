import type { SessionKey } from "../../domain/agent/session-key";
import type { TxSummary } from "../../ports/chain";
import { createStore, useStore } from "../../lib/store";

export interface GrantedKey extends SessionKey {
  readonly id: number;
  readonly account: string;
  /** The rule as the user typed it. */
  readonly prompt: string;
  /** When it next runs; undefined once revoked, expired or done. */
  readonly nextAt: Date | undefined;
}

/** One thing the agent did or decided not to do. Amounts stay data, never text. */
export interface FeedEntry {
  readonly id: number;
  readonly keyId: number;
  readonly at: Date;
  readonly outcome: "done" | "skipped" | "held" | "failed";
  readonly summary: TxSummary | undefined;
  readonly note: string;
}

interface AgentState {
  readonly keys: readonly GrantedKey[];
  readonly feed: readonly FeedEntry[];
}

/** Session keys granted to the agent and what it has done. Session state: Reset demo clears it. */
export const agentStore = createStore<AgentState>({ keys: [], feed: [] });
export const useAgent = () => useStore(agentStore);

let nextId = 1;
export const newAgentId = () => nextId++;

export function updateKey(id: number, change: (key: GrantedKey) => GrantedKey): void {
  agentStore.set((s) => ({ ...s, keys: s.keys.map((k) => (k.id === id ? change(k) : k)) }));
}

export function logFeed(entry: Omit<FeedEntry, "id">): void {
  agentStore.set((s) => ({ ...s, feed: [{ ...entry, id: newAgentId() }, ...s.feed] }));
}
