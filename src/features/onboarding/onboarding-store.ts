import {
  advance,
  initialOnboarding,
  type Onboarding,
  type OnboardingEvent,
} from "../../domain/onboarding/machine";
import { NAME_SUFFIX } from "../../domain/onboarding/names";
import { createStore, useStore } from "../../lib/store";
import { accountsStore, renameAccount } from "../accounts";

/** The first-run flow's state. */
export const onboardingStore = createStore<Onboarding>(initialOnboarding);

/** True when the shell should send the user to the welcome flow (the fresh-install scenario). */
export const needsOnboardingStore = createStore(false);

/** The name the user claimed, shown in place of the demo account's name. */
export const claimedNameStore = createStore<string | undefined>(undefined);

export function dispatchOnboarding(event: OnboardingEvent): void {
  onboardingStore.set((state) => advance(state, event));
  const next = onboardingStore.get();
  if (next.step === "done") {
    claimedNameStore.set(next.name);
    const first = accountsStore.get()[0];
    if (next.name !== undefined && first !== undefined)
      renameAccount(first.id, `${next.name}${NAME_SUFFIX}`);
    needsOnboardingStore.set(false);
  }
}

export const useOnboarding = () => useStore(onboardingStore);
export const useNeedsOnboarding = () => useStore(needsOnboardingStore);
export const useClaimedName = () => useStore(claimedNameStore);
