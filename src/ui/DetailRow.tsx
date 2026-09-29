import type { ReactNode } from "react";

/** A label and value on one line, for use inside a `<dl>`. */
export function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-ink tabular-nums">{children}</dd>
    </div>
  );
}
