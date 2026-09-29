import { createStore, useStore } from "../../lib/store";

/** Which keyboard surface is open. Session state, so Reset demo closes it. */
export const paletteStore = createStore<"closed" | "palette" | "shortcuts">("closed");
export const usePalette = () => useStore(paletteStore);

export const openPalette = () => {
  paletteStore.set("palette");
};
export const closePalette = () => {
  paletteStore.set("closed");
};

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** ⌘K or Ctrl-K opens the palette anywhere; "?" opens the shortcuts, unless typing. */
export function onPaletteKey(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    paletteStore.set((open) => (open === "palette" ? "closed" : "palette"));
  } else if (event.key === "?" && !typing(event.target)) {
    event.preventDefault();
    paletteStore.set("shortcuts");
  }
}
