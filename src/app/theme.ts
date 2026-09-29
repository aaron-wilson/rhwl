import { createStore, useStore } from "../lib/store";

export type ThemePreference = "system" | "light" | "dark";

export const themeStore = createStore<ThemePreference>("system", "preference");

themeStore.subscribe(() => {
  const root = document.documentElement;
  const next = themeStore.get();
  if (next === "system") {
    delete root.dataset["theme"];
  } else {
    root.dataset["theme"] = next;
  }
});

/** Sets the theme. An explicit choice beats the OS setting in both directions. */
export function setThemePreference(next: ThemePreference): void {
  themeStore.set(next);
}

export function useThemePreference(): ThemePreference {
  return useStore(themeStore);
}
