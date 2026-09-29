import type { ReactNode } from "react";
import { splashSoftMix, type SplashName } from "../tokens/color";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "gain" | "loss" | "live" | "warn" | "accent";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  gain: "bg-gain-soft text-gain",
  loss: "bg-loss-soft text-loss",
  live: "bg-live-soft text-live",
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent",
};

export interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
  /** Content color for category chips; overrides tone. */
  readonly splash?: SplashName;
  readonly icon?: ReactNode;
}

export function Badge({ children, tone = "neutral", splash, icon }: BadgeProps) {
  const style =
    splash === undefined
      ? undefined
      : {
          color: `var(--rh-color-splash-${splash})`,
          backgroundColor: `color-mix(in srgb, var(--rh-color-splash-${splash}) ${splashSoftMix}%, var(--rh-color-surface))`,
        };
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-footnote font-semibold whitespace-nowrap tabular-nums",
        splash === undefined && tones[tone],
      )}
      style={style}
    >
      {icon}
      {children}
    </span>
  );
}
