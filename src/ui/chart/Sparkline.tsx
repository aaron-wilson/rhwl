import { useMemo } from "react";
import { cx } from "../cx";
import { frameOf, linePath } from "./geometry";

/** A small decorative trend line for list rows. The row's own text carries the meaning. */
export function Sparkline({
  values,
  up,
  className,
}: {
  readonly values: readonly number[];
  readonly up: boolean;
  readonly className?: string;
}) {
  const path = useMemo(() => linePath(values, frameOf(values), 32), [values]);
  return (
    <svg
      viewBox="0 0 1000 32"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cx("block h-8 w-16", up ? "text-gain" : "text-loss", className)}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
