export type HapticKind = "light" | "success" | "warning" | "error";

/** Physical feedback where the device supports it; a silent no-op elsewhere. */
export interface Haptics {
  play(kind: HapticKind): void;
}
