/** A typed fire-and-forget event channel. State belongs in stores; this is for things that happen. */
export interface Channel<T> {
  readonly publish: (event: T) => void;
  readonly subscribe: (listener: (event: T) => void) => () => void;
}

export function createChannel<T>(): Channel<T> {
  const listeners = new Set<(event: T) => void>();
  return {
    publish: (event) => {
      listeners.forEach((listener) => {
        listener(event);
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
