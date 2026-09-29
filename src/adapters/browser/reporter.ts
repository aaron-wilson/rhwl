import type { Reporter } from "../../ports/reporter";

/** The browser console, so a thrown page is visible in devtools. */
export function createConsoleReporter(): Reporter {
  return {
    report(error, where) {
      console.error(`[${where}]`, error);
    },
  };
}
