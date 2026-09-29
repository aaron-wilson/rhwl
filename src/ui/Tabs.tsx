import * as m from "motion/react-m";
import { useId, useRef, type KeyboardEvent } from "react";
import { spring } from "../tokens/motion";
import { cx } from "./cx";
import { MaxMotion } from "./MaxMotion";

export interface TabsProps<T extends string> {
  readonly label: string;
  readonly tabs: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

/** A tablist with roving focus: arrows, Home and End move and select. */
export function Tabs<T extends string>({ label, tabs, value, onChange }: TabsProps<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;
    const tab = next === undefined ? undefined : tabs[next];
    if (next === undefined || tab === undefined) return;
    event.preventDefault();
    onChange(tab.value);
    refs.current[next]?.focus();
  }

  return (
    <MaxMotion>
      <div role="tablist" aria-label={label} className="flex gap-6 border-b border-line">
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${id}-${tab.value}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                onChange(tab.value);
              }}
              onKeyDown={(event) => {
                move(event, index);
              }}
              className={cx(
                "relative pb-3 text-body font-semibold transition-colors duration-fast",
                selected ? "text-ink" : "text-ink-3 hover:text-ink-2",
              )}
            >
              {tab.label}
              {selected && (
                <m.span
                  layoutId={`${id}-indicator`}
                  className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-accent"
                  transition={spring.settle}
                />
              )}
            </button>
          );
        })}
      </div>
    </MaxMotion>
  );
}
