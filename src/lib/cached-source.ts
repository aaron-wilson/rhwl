export interface CachedSource<T> {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => T;
}

/**
 * Wraps a value rebuilt on every read so useSyncExternalStore sees the same
 * object until `keyOf` says something actually changed.
 */
export function cachedSource<T>(
  subscribe: (listener: () => void) => () => void,
  read: () => T,
  keyOf: (value: T) => string,
): CachedSource<T> {
  let cached: { key: string; value: T } | undefined;
  return {
    subscribe,
    getSnapshot() {
      const value = read();
      const key = keyOf(value);
      if (cached?.key !== key) cached = { key, value };
      return cached.value;
    },
  };
}

/**
 * Builds a value once per (owner, key) pair and reuses it, holding owners
 * weakly: one cached source per chain and account, say.
 */
export function memoByOwner<O extends object, T>(
  build: (owner: O, key: string) => T,
): (owner: O, key: string) => T {
  const cache = new WeakMap<O, Map<string, T>>();
  return (owner, key) => {
    let perOwner = cache.get(owner);
    if (perOwner === undefined) {
      perOwner = new Map();
      cache.set(owner, perOwner);
    }
    let value = perOwner.get(key);
    if (value === undefined) {
      value = build(owner, key);
      perOwner.set(key, value);
    }
    return value;
  };
}
