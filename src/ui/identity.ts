import { splash, type SplashName } from "../tokens/color";

const isSplashName = (name: string): name is SplashName => name in splash;
const splashNames: readonly SplashName[] = Object.keys(splash).filter(isSplashName);

/** Stable string hash (FNV-1a), so the same symbol or address always gets the same color. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function splashFor(seed: string, offset = 0): SplashName {
  return splashNames[(hash(seed) + offset) % splashNames.length] ?? "sky";
}

/** One or two letters for a monogram: "NVDA" → "N", "USDG" → "U", "you.rh" → "Y". */
export function monogram(label: string): string {
  const clean = label.replace(/^[$@]/, "");
  return (clean.charAt(0) || "?").toUpperCase();
}
