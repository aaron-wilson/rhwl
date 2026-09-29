import type { HapticKind, Haptics } from "../../ports/haptics";

/** Records what would have buzzed, so tests and presenter mode can show it. */
export function createDemoHaptics(): Haptics & { readonly played: readonly HapticKind[] } {
  const played: HapticKind[] = [];
  return {
    played,
    play: (kind) => {
      played.push(kind);
    },
  };
}
