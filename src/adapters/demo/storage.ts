import type { KeyValueStorage } from "../../ports/storage";

/** In-memory storage: nothing survives a reload. Used by tests and private demos. */
export function createMemoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key),
    set: (key, value) => {
      data.set(key, value);
    },
    remove: (key) => {
      data.delete(key);
    },
  };
}
