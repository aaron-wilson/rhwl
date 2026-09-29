import type { Clock } from "../../ports/clock";

export function createBrowserClock(): Clock {
  return {
    now: () => new Date(),
    schedule(fn, ms) {
      const id = setTimeout(fn, ms);
      return () => {
        clearTimeout(id);
      };
    },
  };
}
