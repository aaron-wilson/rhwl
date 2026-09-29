import { allowAll, type Policy } from "../../domain/policy/decision";
import { createStore } from "../../lib/store";

/**
 * The spending policy every transaction passes through. Wrapped in an object
 * because a store treats a bare function as an updater.
 */
export const policyStore = createStore<{ readonly check: Policy }>({ check: allowAll }, "app");
