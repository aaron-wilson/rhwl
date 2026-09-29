import { registerGuardrails } from "../features/guardrails/register";
import { registerTxFeedback } from "../features/transactions/tx-feedback";
import { createStore, resetAllStores, type ReadableStore } from "../lib/store";
import type { Providers } from "../ports/providers";

/**
 * One demo session: the providers in use plus everything built on them.
 * Reset demo swaps in fresh providers and clears session state, but keeps
 * preferences such as the theme. The session is deliberately ephemeral.
 */
export interface Session<P extends Providers = Providers> {
  readonly providers: ReadableStore<P>;
  readonly resetDemo: () => void;
}

/**
 * `setup` runs at creation and after every Reset demo, e.g. to send a
 * fresh-install scenario back through onboarding.
 */
export function createSession<P extends Providers>(
  makeProviders: () => P,
  setup: () => void = () => undefined,
): Session<P> {
  const providers = createStore(makeProviders(), "app");
  registerGuardrails(() => providers.get());
  setup();
  let stopFeedback = registerTxFeedback(providers.get().haptics);
  return {
    providers,
    resetDemo() {
      stopFeedback();
      providers.set(makeProviders());
      resetAllStores("session");
      stopFeedback = registerTxFeedback(providers.get().haptics);
      setup();
    },
  };
}
