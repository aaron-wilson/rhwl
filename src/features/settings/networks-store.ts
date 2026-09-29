import type { CustomNetwork } from "../../domain/networks/custom";
import { createStore, useStore } from "../../lib/store";

/** Networks the user added. Session state: Reset demo removes them. */
export const customNetworksStore = createStore<readonly CustomNetwork[]>([]);
export const useCustomNetworks = () => useStore(customNetworksStore);
