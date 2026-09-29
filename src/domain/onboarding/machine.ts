/** First-run flow. Screens dispatch events; only this reducer decides the next step. */
export type OnboardingStep =
  "splash" | "method" | "passkey" | "phrase" | "quiz" | "import" | "name" | "region" | "done";

export type OnboardingEvent =
  | { readonly type: "start" }
  | { readonly type: "choose_passkey" }
  | { readonly type: "passkey_created" }
  | { readonly type: "choose_phrase" }
  | { readonly type: "phrase_saved" }
  | { readonly type: "quiz_passed" }
  | { readonly type: "choose_import" }
  | { readonly type: "imported" }
  | { readonly type: "claim_name"; readonly name: string }
  | { readonly type: "choose_region"; readonly region: string }
  | { readonly type: "back" };

export interface Onboarding {
  readonly step: OnboardingStep;
  readonly name: string | undefined;
  readonly region: string | undefined;
}

export class IllegalOnboardingStep extends Error {
  constructor(step: OnboardingStep, event: OnboardingEvent["type"]) {
    super(`Cannot apply "${event}" at step "${step}"`);
    this.name = "IllegalOnboardingStep";
  }
}

export const initialOnboarding: Onboarding = { step: "splash", name: undefined, region: undefined };

/**
 * Where "back" goes. A created passkey, a verified phrase or a finished import
 * cannot be undone, so nothing leads back into them from the name step.
 */
const previous: Partial<Record<OnboardingStep, OnboardingStep>> = {
  method: "splash",
  phrase: "method",
  quiz: "phrase",
  import: "method",
  region: "name",
};

const allowed: Readonly<Record<OnboardingStep, readonly OnboardingEvent["type"][]>> = {
  splash: ["start"],
  method: ["choose_passkey", "choose_phrase", "choose_import", "back"],
  passkey: ["passkey_created"],
  phrase: ["phrase_saved", "back"],
  quiz: ["quiz_passed", "back"],
  import: ["imported", "back"],
  name: ["claim_name"],
  region: ["choose_region", "back"],
  done: [],
};

export function advance(state: Onboarding, event: OnboardingEvent): Onboarding {
  if (!allowed[state.step].includes(event.type))
    throw new IllegalOnboardingStep(state.step, event.type);
  switch (event.type) {
    case "start":
      return { ...state, step: "method" };
    case "choose_passkey":
      return { ...state, step: "passkey" };
    case "passkey_created":
    case "quiz_passed":
    case "imported":
      return { ...state, step: "name" };
    case "choose_phrase":
      return { ...state, step: "phrase" };
    case "phrase_saved":
      return { ...state, step: "quiz" };
    case "choose_import":
      return { ...state, step: "import" };
    case "claim_name":
      return { ...state, step: "region", name: event.name };
    case "choose_region":
      return { ...state, step: "done", region: event.region };
    case "back":
      return { ...state, step: previous[state.step] ?? state.step };
  }
}
