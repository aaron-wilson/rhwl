interface MarkProps {
  readonly size?: number;
  readonly className?: string;
}

/**
 * The prototype's original mark: a tile holding a rising price line that ends
 * in a live dot. Colors follow the theme and the market tint.
 */
export function Mark({ size = 32, className = "" }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Wallet"
      className={className}
    >
      <rect width="64" height="64" rx="16" className="fill-ink" />
      <polyline
        points="13,43 25,32 35,37 49,21"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-accent"
      />
      <circle cx="49" cy="21" r="8" className="fill-ink" />
      <circle cx="49" cy="21" r="5.5" className="fill-accent" />
    </svg>
  );
}

/** Mark plus the plain system-font wordmark. */
export function Lockup({ className = "" }: { readonly className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={28} />
      <span className="text-headline font-semibold">Wallet</span>
    </span>
  );
}
