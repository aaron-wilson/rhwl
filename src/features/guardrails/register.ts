import { checkGuardrails } from "../../domain/policy/guardrails";
import type { Providers } from "../../ports/providers";
import { policyStore } from "../transactions";
import { guardrailFacts } from "./facts";
import { guardrailsStore } from "./guardrails-store";

/** Makes the user's guardrails the spending policy for every transaction. */
export function registerGuardrails(providers: () => Pick<Providers, "chain" | "market">): void {
  policyStore.set({
    check: (request, context) => {
      const { chain, market } = providers();
      return checkGuardrails(
        guardrailsStore.get(),
        guardrailFacts(request, chain.history(context.account), market, context.now),
      );
    },
  });
}
