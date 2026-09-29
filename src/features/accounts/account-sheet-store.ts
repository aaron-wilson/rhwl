import { createStore, useStore } from "../../lib/store";

/** Whether the account switcher is open. */
export const accountSheetStore = createStore(false);

export const openAccountSheet = () => {
  accountSheetStore.set(true);
};
export const closeAccountSheet = () => {
  accountSheetStore.set(false);
};
export const useAccountSheetOpen = () => useStore(accountSheetStore);
