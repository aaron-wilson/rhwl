import * as z from "zod/mini";
import { balancesHiddenStore } from "../features/privacy/privacy";
import type { KeyValueStorage } from "../ports/storage";
import { displayCurrencyStore } from "../domain/money/display";
import { hapticsOnStore, hideSmallStore } from "./preferences";
import { themeStore } from "./theme";

/** The key the pre-paint script in index.html also reads. Change both together. */
export const SNAPSHOT_KEY = "rhwl:v1";

const Snapshot = z.object({
  version: z.literal(1),
  theme: z.enum(["system", "light", "dark"]),
  balancesHidden: z.boolean(),
});

function read(storage: KeyValueStorage): z.infer<typeof Snapshot> | undefined {
  const raw = storage.get(SNAPSHOT_KEY);
  if (raw === undefined) return undefined;
  try {
    const parsed = Snapshot.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** Display preferences added in Phase H, under their own key so the first-paint snapshot keeps its shape. */
export const PREFS_KEY = "rhwl:prefs:v1";

const Prefs = z.object({
  version: z.literal(1),
  currency: z.enum(["USD", "EUR", "GBP"]),
  haptics: z.boolean(),
  hideSmall: z.boolean(),
});

function readPrefs(storage: KeyValueStorage): z.infer<typeof Prefs> | undefined {
  const raw = storage.get(PREFS_KEY);
  if (raw === undefined) return undefined;
  try {
    const parsed = Prefs.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** Restores the display preferences and saves them on every change. */
function hydratePrefs(storage: KeyValueStorage): () => void {
  const saved = readPrefs(storage);
  if (saved !== undefined) {
    displayCurrencyStore.set(saved.currency);
    hapticsOnStore.set(saved.haptics);
    hideSmallStore.set(saved.hideSmall);
  }
  const save = () => {
    const prefs = {
      version: 1,
      currency: displayCurrencyStore.get(),
      haptics: hapticsOnStore.get(),
      hideSmall: hideSmallStore.get(),
    };
    try {
      storage.set(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Storage can be full or blocked; preferences then last for this session only.
    }
  };
  const offs = [displayCurrencyStore, hapticsOnStore, hideSmallStore].map((s) => s.subscribe(save));
  return () => {
    offs.forEach((off) => {
      off();
    });
  };
}

/**
 * Restores saved preferences, then saves them whenever they change. An invalid
 * or unreadable snapshot is ignored and replaced on the next change.
 */
export function hydrate(storage: KeyValueStorage): () => void {
  const saved = read(storage);
  if (saved !== undefined) {
    themeStore.set(saved.theme);
    balancesHiddenStore.set(saved.balancesHidden);
  }
  const save = () => {
    const snapshot = {
      version: 1,
      theme: themeStore.get(),
      balancesHidden: balancesHiddenStore.get(),
    };
    try {
      storage.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage can be full or blocked; preferences then last for this session only.
    }
  };
  const offTheme = themeStore.subscribe(save);
  const offHidden = balancesHiddenStore.subscribe(save);
  const offPrefs = hydratePrefs(storage);
  return () => {
    offTheme();
    offHidden();
    offPrefs();
  };
}
