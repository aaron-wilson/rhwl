import { splashSoftMix, type SplashName } from "../tokens/color";
import { cx } from "./cx";
import { monogram, splashFor } from "./identity";

export type IconSize = "sm" | "md" | "lg";

const sizes: Record<IconSize, string> = {
  sm: "size-6 text-caption",
  md: "size-10 text-headline",
  lg: "size-14 text-title3",
};

export interface TokenIconProps {
  readonly symbol: string;
  readonly size?: IconSize;
  readonly splash?: SplashName;
  /** Small corner badge, such as a chain or a "stock" marker. */
  readonly badge?: string;
}

/** Monogram icon colored from the content itself. Real token artwork replaces it when supplied. */
export function TokenIcon({ symbol, size = "md", splash, badge }: TokenIconProps) {
  const tone = splash ?? splashFor(symbol);
  return (
    <span className="relative inline-flex shrink-0">
      <span
        aria-hidden="true"
        className={cx(
          "inline-flex items-center justify-center rounded-full font-bold",
          sizes[size],
        )}
        style={{
          color: `var(--rh-color-splash-${tone})`,
          backgroundColor: `color-mix(in srgb, var(--rh-color-splash-${tone}) ${splashSoftMix}%, var(--rh-color-surface))`,
        }}
      >
        {monogram(symbol)}
      </span>
      {badge !== undefined && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -bottom-1 rounded-full border-2 border-surface bg-ink px-1 text-caption leading-none font-bold text-canvas"
        >
          {badge}
        </span>
      )}
      <span className="sr-only">{symbol}</span>
    </span>
  );
}
