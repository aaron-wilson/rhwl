import { useEffect } from "react";
import { createStore, useStore } from "../lib/store";

export type Tint = "gain" | "loss";

/** The whole app's market mood. Home and asset pages set it from the selected range; nothing else does. */
export const tintStore = createStore<Tint>("gain");

export function setTint(tint: Tint): void {
  tintStore.set(tint);
}

/** Mounted once at the root: mirrors the tint onto <html data-tint>, where the tokens read it. */
export function useApplyTint(): void {
  const tint = useStore(tintStore);
  useEffect(() => {
    document.documentElement.dataset["tint"] = tint;
  }, [tint]);
}
