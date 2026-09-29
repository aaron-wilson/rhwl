import { cx } from "./cx";

/** A placeholder shaped like the content it stands in for, so nothing jumps on load. */
export function Skeleton({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("block animate-shimmer rounded-sm bg-surface-2", className)}
    />
  );
}
