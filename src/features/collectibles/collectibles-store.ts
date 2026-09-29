import { assets } from "../../data/assets";
import {
  collectionById,
  genesisCollectibles,
  type Collectible,
  type Collection,
} from "../../data/collectibles";
import { isSpam, spamReasons, type SpamReason } from "../../domain/collectibles/spam";
import { createStore, useStore } from "../../lib/store";

export type Verdict = "spam" | "not-spam";

interface CollectiblesState {
  readonly items: readonly Collectible[];
  /** Items with a burn or send in flight: shown as leaving, restored if it fails. */
  readonly leaving: readonly string[];
  /** The user's own call, which overrides detection. */
  readonly verdicts: Readonly<Record<string, Verdict>>;
}

/** Collectibles are wallet-side state: the demo ledger only charges the fee to move them. */
export const collectiblesStore = createStore<CollectiblesState>({
  items: genesisCollectibles,
  leaving: [],
  verdicts: {},
});

export interface CollectibleView {
  readonly item: Collectible;
  readonly collection: Collection;
  readonly reasons: readonly SpamReason[];
  /** Detection, unless the user said otherwise. */
  readonly spam: boolean;
  readonly verdict: Verdict | undefined;
  readonly leaving: boolean;
}

const symbols = assets.map((a) => a.symbol);

function view(state: CollectiblesState, item: Collectible): CollectibleView {
  const collection = collectionById(item.collectionId);
  const reasons = spamReasons(item, collection, symbols);
  const verdict = state.verdicts[item.id];
  return {
    item,
    collection,
    reasons,
    spam: verdict === undefined ? isSpam(reasons) : verdict === "spam",
    verdict,
    leaving: state.leaving.includes(item.id),
  };
}

export interface AccountCollectibles {
  readonly shown: readonly CollectibleView[];
  /** Spam, kept out of the grid and out of every total. */
  readonly hidden: readonly CollectibleView[];
}

const cache = new WeakMap<CollectiblesState, Map<string, AccountCollectibles>>();

function forAccount(state: CollectiblesState, account: string): AccountCollectibles {
  let perState = cache.get(state);
  if (perState === undefined) {
    perState = new Map();
    cache.set(state, perState);
  }
  const hit = perState.get(account);
  if (hit !== undefined) return hit;
  const views = state.items.filter((i) => i.owner === account).map((i) => view(state, i));
  const result = { shown: views.filter((v) => !v.spam), hidden: views.filter((v) => v.spam) };
  perState.set(account, result);
  return result;
}

export function useCollectibles(account: string): AccountCollectibles {
  return useStore(collectiblesStore, (state) => forAccount(state, account));
}

export function useCollectible(id: string): CollectibleView | undefined {
  return useStore(collectiblesStore, (state) => {
    const item = state.items.find((i) => i.id === id);
    if (item === undefined) return undefined;
    // Views come from the per-account cache, so the selection is stable between renders.
    const { shown, hidden } = forAccount(state, item.owner);
    return [...shown, ...hidden].find((v) => v.item.id === id);
  });
}

export function setVerdict(id: string, verdict: Verdict): void {
  collectiblesStore.set((state) => ({ ...state, verdicts: { ...state.verdicts, [id]: verdict } }));
}
