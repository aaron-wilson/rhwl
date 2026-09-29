import type { Visibility } from "../../ports/visibility";

export function createBrowserVisibility(): Visibility {
  return {
    isVisible: () => document.visibilityState === "visible",
    subscribe(listener) {
      const onChange = () => {
        listener(document.visibilityState === "visible");
      };
      document.addEventListener("visibilitychange", onChange);
      return () => {
        document.removeEventListener("visibilitychange", onChange);
      };
    },
  };
}
