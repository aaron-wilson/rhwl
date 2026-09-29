import { createStore, useStore } from "../../lib/store";

/** The tour step showing, or undefined when no tour is running. App scope: a reset keeps it. */
export const tourStore = createStore<number | undefined>(undefined, "app");
export const useTourStep = () => useStore(tourStore);

export const startTour = () => {
  tourStore.set(0);
};
export const endTour = () => {
  tourStore.set(undefined);
};
