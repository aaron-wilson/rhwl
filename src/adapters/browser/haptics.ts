import type { HapticKind, Haptics } from "../../ports/haptics";

const patterns: Record<HapticKind, number | number[]> = {
  light: 8,
  success: [10, 40, 18],
  warning: [18, 60, 18],
  error: [24, 40, 24, 40, 24],
};

/** The Vibration API where it exists (Android browsers); a no-op everywhere else. */
export function createBrowserHaptics(): Haptics {
  return {
    play(kind) {
      if (typeof navigator.vibrate === "function") navigator.vibrate(patterns[kind]);
    },
  };
}
