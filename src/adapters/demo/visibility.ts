import type { Visibility } from "../../ports/visibility";

/** Visibility a test or presenter can flip, as if the app went to the background. */
export function createDemoVisibility(): Visibility & { setVisible(visible: boolean): void } {
  let visible = true;
  const listeners = new Set<(visible: boolean) => void>();
  return {
    isVisible: () => visible,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setVisible(next) {
      if (next === visible) return;
      visible = next;
      listeners.forEach((listener) => {
        listener(next);
      });
    },
  };
}
