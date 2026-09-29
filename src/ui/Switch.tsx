import { cx } from "./cx";

export interface SwitchProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly description?: string;
}

export function Switch({ label, checked, onChange, disabled = false, description }: SwitchProps) {
  return (
    // Disabled dims the control only; the label stays readable (AA), just quieter.
    <label className={cx("flex items-center gap-3", !disabled && "cursor-pointer")}>
      <span className="flex flex-1 flex-col">
        <span className={cx("text-body font-semibold", disabled && "text-ink-3")}>{label}</span>
        {description !== undefined && (
          <span className="text-footnote text-ink-3">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          onChange(!checked);
        }}
        className={cx(
          "relative h-8 w-12 shrink-0 rounded-full p-1 transition-colors duration-base disabled:opacity-40",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={cx(
            "block size-6 rounded-full bg-surface shadow-sm transition-transform duration-base ease-spring",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    </label>
  );
}
