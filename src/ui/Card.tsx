import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lifts on hover; use for cards that navigate. */
  readonly interactive?: boolean;
  /** "list" for cards holding rows that pad themselves; "none" when the child fills the card. */
  readonly padding?: CardPadding;
}

export type CardPadding = "normal" | "list" | "none";

// A padding class passed through className would lose to p-4 (Tailwind orders
// utilities, not class lists), so padding is a prop.
const paddings: Record<CardPadding, string> = { normal: "p-4", list: "p-1", none: "" };

export function Card({ interactive = false, padding = "normal", className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-lg border border-line bg-surface shadow-sm",
        paddings[padding],
        interactive &&
          "transition-[transform,box-shadow] duration-base ease-standard hover:-translate-y-px hover:shadow-md",
        className,
      )}
      {...rest}
    />
  );
}
