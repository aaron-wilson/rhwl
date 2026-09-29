import { useMemo } from "react";
import { cx } from "./cx";
import { qrPath, QUIET } from "./qr";

/**
 * A scannable QR code. It sits on a plate that stays light in dark mode,
 * because many scanners cannot read light-on-dark codes.
 */
export function QrCode({
  value,
  label,
  className,
}: {
  readonly value: string;
  readonly label: string;
  readonly className?: string;
}) {
  const { size, d } = useMemo(() => qrPath(value), [value]);
  return (
    <svg
      role="img"
      aria-label={label}
      data-qr-value={value}
      viewBox={`${-QUIET} ${-QUIET} ${size + QUIET * 2} ${size + QUIET * 2}`}
      shapeRendering="crispEdges"
      className={cx("block aspect-square rounded-md bg-code-plate text-code-ink", className)}
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}
