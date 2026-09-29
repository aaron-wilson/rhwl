import { iconSize, iconStroke } from "../tokens/scale";

/** Props for a decorative lucide icon at a token size. Label the control, not the icon. */
export function icon(size: keyof typeof iconSize = "md") {
  return { size: iconSize[size], strokeWidth: iconStroke, "aria-hidden": true } as const;
}
