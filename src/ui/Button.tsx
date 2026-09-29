import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "live";
export type ButtonSize = "lg" | "md" | "sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent",
  secondary: "bg-surface-2 text-ink",
  ghost: "bg-transparent text-accent",
  destructive: "bg-loss text-on-loss",
  live: "bg-live text-on-live",
};

const sizes: Record<ButtonSize, string> = {
  lg: "h-12 px-6 text-headline rounded-full gap-2",
  md: "h-10 px-4 text-body rounded-full gap-2",
  sm: "h-8 px-3 text-footnote rounded-full gap-1",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly block?: boolean;
  readonly icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  icon,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center font-semibold select-none",
        "transition-[transform,opacity] duration-fast ease-standard active:scale-97",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}
