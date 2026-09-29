import { cx } from "./cx";
import { monogram, splashFor } from "./identity";
import type { IconSize } from "./TokenIcon";

const sizes: Record<IconSize, string> = {
  sm: "size-6 text-caption",
  md: "size-10 text-headline",
  lg: "size-14 text-title3",
};

export interface AvatarProps {
  /** Address or name the colors are derived from. */
  readonly seed: string;
  readonly label: string;
  readonly size?: IconSize;
}

/** Account avatar: a two-color gradient derived from the address, with the name's initial. */
export function Avatar({ seed, label, size = "md" }: AvatarProps) {
  const from = splashFor(seed);
  const to = splashFor(seed, 3);
  return (
    <span
      role="img"
      aria-label={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-surface",
        sizes[size],
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, var(--rh-color-splash-${from}), var(--rh-color-splash-${to}))`,
      }}
    >
      {monogram(label)}
    </span>
  );
}
