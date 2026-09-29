import { useSyncExternalStore } from "react";

export interface Store<T> {
  readonly get: () => T;
  readonly set: (next: T | ((previous: T) => T)) => void;
  readonly subscribe: (listener: () => void) => () => void;
  /** Restores the initial value and notifies subscribers. For tests and "Reset demo". */
  readonly reset: () => void;
}

/**
 * "session" is the demo world's state and is cleared by Reset demo.
 * "preference" (theme, hidden balances) and "app" (the session itself) survive
 * it. Tests reset every scope.
 */
export type StoreScope = "session" | "preference" | "app";

/** The read side of a store, which is safe to share covariantly. */
export type ReadableStore<T> = Pick<Store<T>, "get" | "subscribe">;

interface Registered {
  readonly scope: StoreScope;
  readonly pristine: () => boolean;
}

const registry = new Map<() => void, Registered>();

function isUpdater<T>(next: T | ((previous: T) => T)): next is (previous: T) => T {
  return typeof next === "function";
}

/**
 * A tiny observable value that lives outside React. Every app-level store uses this.
 * `set` treats a function argument as an updater, so to store a function, wrap it
 * in an object (`{ sign }`).
 */
export function createStore<T>(initial: T, scope: StoreScope = "session"): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  const emit = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };
  const store: Store<T> = {
    get: () => value,
    set: (next) => {
      const resolved = isUpdater(next) ? next(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset: () => {
      if (Object.is(value, initial)) return;
      value = initial;
      emit();
    },
  };
  registry.set(store.reset, { scope, pristine: () => Object.is(value, initial) });
  return store;
}

/** Resets every store created so far, or only one scope. Tests reset all so state never leaks. */
export function resetAllStores(scope?: StoreScope): void {
  registry.forEach((entry, reset) => {
    if (scope === undefined || scope === entry.scope) reset();
  });
}

/** How many stores in a scope hold something other than their initial value. Zero after a reset. */
export function changedStores(scope: StoreScope): number {
  let changed = 0;
  registry.forEach((entry) => {
    if (entry.scope === scope && !entry.pristine()) changed += 1;
  });
  return changed;
}

/**
 * Subscribes a component to a store. The selector must return a primitive or a
 * value already held in the store, because results are compared with Object.is.
 */
export function useStore<T>(store: ReadableStore<T>): T;
export function useStore<T, S>(store: ReadableStore<T>, selector: (value: T) => S): S;
export function useStore<T, S>(store: ReadableStore<T>, selector?: (value: T) => S): T | S {
  const read = () => (selector === undefined ? store.get() : selector(store.get()));
  return useSyncExternalStore(store.subscribe, read, read);
}
