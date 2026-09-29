import { createStore, useStore } from "../lib/store";

/** Whether actions buzz on devices that can. A preference: it survives Reset demo. */
export const hapticsOnStore = createStore(true, "preference");
/** Whether Home leaves out holdings worth under $1. */
export const hideSmallStore = createStore(false, "preference");

export const useHapticsOn = () => useStore(hapticsOnStore);
export const useHideSmall = () => useStore(hideSmallStore);

/** Below this, in USD cents, a holding counts as small. */
export const SMALL_BALANCE_CENTS = 100n;
