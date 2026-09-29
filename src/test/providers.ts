import { createDemoChain } from "../adapters/demo/chain";
import { createDemoClipboard } from "../adapters/demo/clipboard";
import { createDemoClock } from "../adapters/demo/clock";
import { createDemoHaptics } from "../adapters/demo/haptics";
import { createDemoMarket } from "../adapters/demo/market";
import { createSilentReporter } from "../adapters/demo/reporter";
import { genesis } from "../data/accounts";
import { DEFAULT_SEED } from "../data/world";
import { createDemoShare } from "../adapters/demo/share";
import { createDemoSimulation } from "../adapters/demo/simulation";
import { createMemoryStorage } from "../adapters/demo/storage";
import { createDemoVisibility } from "../adapters/demo/visibility";
import type { Providers } from "../ports/providers";

/** Deterministic providers for tests: a frozen demo clock and in-memory storage. */
export function testProviders(start = new Date("2026-09-29T16:00:00Z"), seed = DEFAULT_SEED) {
  const clock = createDemoClock(start, { frozen: true });
  const chain = createDemoChain({ clock, seed, genesis });
  const providers = {
    clock,
    storage: createMemoryStorage(),
    sessionStorage: createMemoryStorage(),
    reporter: createSilentReporter(),
    haptics: createDemoHaptics(),
    share: createDemoShare(),
    clipboard: createDemoClipboard(),
    visibility: createDemoVisibility(),
    market: createDemoMarket(seed),
    chain,
    simulation: createDemoSimulation(chain),
    demo: {
      failNextTransaction: (reason: string) => {
        chain.failNext(reason);
      },
      advanceClock: (ms: number) => {
        clock.advance(ms);
      },
      resumeClock: () => {
        clock.setFrozen(false);
      },
    },
  } satisfies Providers;
  return providers;
}
