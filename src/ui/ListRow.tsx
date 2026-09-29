import type { ReactNode } from "react";
import { cx } from "./cx";

export interface ListRowProps {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  readonly trailingSub?: ReactNode;
  readonly onClick?: () => void;
  readonly className?: string;
}

/** The workhorse row: asset, activity, setting. Becomes a button when clickable. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  trailingSub,
  onClick,
  className,
}: ListRowProps) {
  const content = (
    <>
      {leading}
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-headline font-semibold">{title}</span>
        {subtitle !== undefined && (
          <span className="truncate text-footnote text-ink-3">{subtitle}</span>
        )}
      </span>
      {(trailing !== undefined || trailingSub !== undefined) && (
        <span className="flex shrink-0 flex-col items-end tabular-nums">
          {trailing !== undefined && (
            <span className="text-headline font-semibold">{trailing}</span>
          )}
          {trailingSub !== undefined && <span className="text-footnote">{trailingSub}</span>}
        </span>
      )}
    </>
  );
  const base = cx("flex min-h-14 w-full items-center gap-3 rounded-md px-3 py-2", className);
  if (onClick === undefined) {
    return <div className={base}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(base, "transition-colors duration-fast hover:bg-surface-2 active:bg-surface-2")}
    >
      {content}
    </button>
  );
}
