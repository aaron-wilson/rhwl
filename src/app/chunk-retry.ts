import type { Clock } from "../ports/clock";
import type { KeyValueStorage } from "../ports/storage";

/** Set in sessionStorage before the one reload a missing chunk earns; cleared by any good load. */
export const RELOAD_MARK = "reload-once";
export const RETRY_DELAY_MS = 500;

export interface ChunkRetryDeps {
  readonly clock: () => Clock;
  readonly sessionStorage: () => KeyValueStorage;
  readonly reload: () => void;
}

export type ChunkLoader = <T>(load: () => Promise<T>) => Promise<T>;

function clearMark(storage: KeyValueStorage): void {
  try {
    storage.remove(RELOAD_MARK);
  } catch {
    // A mark that cannot be cleared only costs a boundary instead of a reload later.
  }
}

/**
 * Loads a route chunk. After a deploy the old chunk names are gone, so a failed
 * import is retried once after 500 ms, then earns one page reload per tab, then
 * throws so the route's error boundary shows.
 */
export function createChunkLoader(deps: ChunkRetryDeps): ChunkLoader {
  return async function loadChunk<T>(load: () => Promise<T>): Promise<T> {
    const storage = deps.sessionStorage();
    try {
      const loaded = await load();
      clearMark(storage);
      return loaded;
    } catch {
      await new Promise<void>((resolve) => {
        deps.clock().schedule(resolve, RETRY_DELAY_MS);
      });
    }
    try {
      const loaded = await load();
      clearMark(storage);
      return loaded;
    } catch (error) {
      if (storage.get(RELOAD_MARK) !== undefined) throw error;
      storage.set(RELOAD_MARK, "1");
      deps.reload();
      // The page is going away; never settle, so nothing renders in between.
      return new Promise<T>(() => undefined);
    }
  };
}
