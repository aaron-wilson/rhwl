import { duration, easing } from "./scale.ts";

/**
 * Presets for the motion library, derived from the same duration and easing
 * tokens as the CSS, so JavaScript and CSS animations feel identical.
 */
export const spring = {
  /** Thumbs and indicators sliding between options. */
  snappy: { type: "spring", stiffness: 500, damping: 38 },
  /** Things settling back into place after a drag. */
  settle: { type: "spring", stiffness: 500, damping: 40 },
  /** Sheets arriving. Slightly softer, because they travel further. */
  sheet: { type: "spring", stiffness: 420, damping: 40 },
} as const;

type Bezier = readonly [number, number, number, number];

/** Parses a "cubic-bezier(a, b, c, d)" token into the array motion expects. */
export function bezier(token: string): Bezier {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(token);
  const parts = match?.[1]?.split(",").map((part) => Number(part.trim())) ?? [];
  const [a, b, c, d] = parts;
  if (
    parts.length !== 4 ||
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined
  ) {
    throw new Error(`Not a cubic-bezier token: ${token}`);
  }
  return [a, b, c, d];
}

/** A tween preset: a duration token in seconds plus an easing token. */
export function tween(
  name: keyof typeof duration,
  ease: keyof typeof easing,
): { readonly duration: number; readonly ease: Bezier } {
  return { duration: duration[name] / 1000, ease: bezier(easing[ease]) };
}

/** No animation at all: what every preset becomes when the user prefers reduced motion. */
export const instant = { duration: 0 } as const;
