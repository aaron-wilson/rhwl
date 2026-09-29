import type { Guardrails } from "../../domain/policy/guardrails";
import { createStore, useStore } from "../../lib/store";

/** The user's own limits. A preference: Reset demo keeps them. All off to start. */
export const guardrailsStore = createStore<Guardrails>({}, "preference");
export const useGuardrails = () => useStore(guardrailsStore);

export function setGuardrails(change: (rails: Guardrails) => Guardrails): void {
  guardrailsStore.set(change);
}
