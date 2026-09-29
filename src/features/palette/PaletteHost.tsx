import { lazy, Suspense, useEffect } from "react";
import { onPaletteKey, usePalette } from "./palette-store";

const Palette = lazy(async () => ({ default: (await import("./Palette")).Palette }));
const Shortcuts = lazy(async () => ({ default: (await import("./Shortcuts")).Shortcuts }));

/** Listens for the palette's keys and loads it on first use, so it costs the home route little. */
export function PaletteHost() {
  const open = usePalette();
  useEffect(() => {
    window.addEventListener("keydown", onPaletteKey);
    return () => {
      window.removeEventListener("keydown", onPaletteKey);
    };
  }, []);
  if (open === "closed") return null;
  return <Suspense fallback={null}>{open === "palette" ? <Palette /> : <Shortcuts />}</Suspense>;
}
