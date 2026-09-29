import { createBrowserClipboard } from "../adapters/browser/clipboard";
import { createBrowserClock } from "../adapters/browser/clock";
import { createBrowserHaptics } from "../adapters/browser/haptics";
import { createConsoleReporter } from "../adapters/browser/reporter";
import { createBrowserShare } from "../adapters/browser/share";
import { createBrowserStorage } from "../adapters/browser/storage";
import { createBrowserVisibility } from "../adapters/browser/visibility";
import { createDemoChain } from "../adapters/demo/chain";
import { createDemoClipboard } from "../adapters/demo/clipboard";
import { createDemoClock } from "../adapters/demo/clock";
import { createDemoHaptics } from "../adapters/demo/haptics";
import { createDemoMarket } from "../adapters/demo/market";
import { createSilentReporter } from "../adapters/demo/reporter";
import { createDemoShare } from "../adapters/demo/share";
import { createDemoSimulation } from "../adapters/demo/simulation";
import { createMemoryStorage } from "../adapters/demo/storage";
import type { AppEnv } from "../config/env";
import { genesis } from "../data/accounts";
import { pastTransactions } from "../data/history";
import type { Providers } from "../ports/providers";
import type { Startup } from "./startup";

/** The real instant the page loaded; the demo clock starts here unless a link names a moment. */
export const loadInstant = (): Date => createBrowserClock().now();

/** The composition root: the only place that knows which adapter backs each port. */
export function createProviders(env: AppEnv, startup: Startup): Providers {
  const demoClock =
    env.VITE_CLOCK === "demo"
      ? createDemoClock(startup.start, { frozen: startup.freeze })
      : undefined;
  const clock = demoClock ?? createBrowserClock();
  // No production market, chain or simulation adapters exist in this prototype; see docs/DECISIONS.md.
  const chain = createDemoChain({ clock, seed: startup.seed, genesis, history: pastTransactions });
  return {
    clock,
    storage: env.VITE_STORAGE === "browser" ? createBrowserStorage() : createMemoryStorage(),
    sessionStorage:
      env.VITE_STORAGE === "browser" ? createBrowserStorage("session") : createMemoryStorage(),
    reporter: env.VITE_REPORTER === "browser" ? createConsoleReporter() : createSilentReporter(),
    haptics: env.VITE_HAPTICS === "browser" ? createBrowserHaptics() : createDemoHaptics(),
    share: env.VITE_SHARE === "browser" ? createBrowserShare() : createDemoShare(),
    clipboard: env.VITE_CLIPBOARD === "browser" ? createBrowserClipboard() : createDemoClipboard(),
    visibility: createBrowserVisibility(),
    market: createDemoMarket(startup.seed),
    chain,
    simulation: createDemoSimulation(chain),
    demo: {
      failNextTransaction: (reason) => {
        chain.failNext(reason);
      },
      advanceClock: (ms) => {
        demoClock?.advance(ms);
      },
      resumeClock: () => {
        demoClock?.setFrozen(false);
      },
    },
  };
}
