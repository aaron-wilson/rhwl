import { useId } from "react";
import { cx } from "./cx";

export interface SegmentedControlProps<T extends string> {
  readonly label: string;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly className?: string;
}

/**
 * Native radios underneath, so arrow keys and screen readers work for free.
 * The thumb is one element slid with a CSS transform, so this control needs no
 * animation library and can sit on the home route.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <fieldset className={cx("relative flex rounded-full bg-surface-2 p-1", className)}>
      <legend className="sr-only">{label}</legend>
      <span aria-hidden="true" className="pointer-events-none absolute inset-1 flex">
        <span
          className="h-full rounded-full bg-surface shadow-sm transition-transform duration-slow ease-spring"
          style={{ width: `${100 / options.length}%`, transform: `translateX(${index * 100}%)` }}
        />
      </span>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cx(
              "relative flex h-8 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-footnote font-semibold",
              "transition-colors duration-fast has-focus-visible:outline-2 has-focus-visible:outline-focus",
              checked ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => {
                onChange(option.value);
              }}
              className="sr-only"
            />
            <span className="relative">{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
