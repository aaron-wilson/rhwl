import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "./cx";

export interface SliderProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onChange: (value: number) => void;
  readonly format?: (value: number) => string;
  readonly marks?: readonly number[];
  readonly className?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Custom slider so leverage and price-shock controls look identical on every browser. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
  marks = [],
  className,
}: SliderProps) {
  const track = useRef<HTMLDivElement>(null);
  const snap = (raw: number) => clamp(Math.round((raw - min) / step) * step + min, min, max);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  function fromPointer(event: PointerEvent) {
    const rect = track.current?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) return;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const next = snap(min + ratio * (max - min));
    if (next !== value) onChange(next);
  }

  function onKeyDown(event: KeyboardEvent) {
    const big = step * 10;
    const next: Partial<Record<string, number>> = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      PageUp: value + big,
      PageDown: value - big,
      Home: min,
      End: max,
    };
    const target = next[event.key];
    if (target === undefined) return;
    event.preventDefault();
    onChange(snap(target));
  }

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <div className="flex justify-between text-footnote">
        <span className="text-ink-2">{label}</span>
        <span className="font-semibold tabular-nums">{format(value)}</span>
      </div>
      <div
        ref={track}
        className="relative flex h-8 touch-none items-center"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          fromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) fromPointer(event);
        }}
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full w-full origin-left bg-accent"
            style={{ transform: `scaleX(${pct(value) / 100})` }}
          />
        </div>
        {marks.map((mark) => (
          <span
            key={mark}
            aria-hidden="true"
            className="absolute size-1 -translate-x-1/2 rounded-full bg-ink-3"
            style={{ left: `${pct(mark)}%` }}
          />
        ))}
        <div
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={format(value)}
          onKeyDown={onKeyDown}
          className="absolute size-6 -translate-x-1/2 cursor-grab rounded-full border border-line bg-surface shadow-md active:cursor-grabbing"
          style={{ left: `${pct(value)}%` }}
        />
      </div>
      {marks.length > 0 && (
        <div className="relative h-4 text-caption text-ink-3 tabular-nums">
          {marks.map((mark) => (
            <span
              key={mark}
              // End labels align inward so they never hang past the track.
              className={cx(
                "absolute",
                mark === min ? "" : mark === max ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{ left: `${pct(mark)}%` }}
            >
              {format(mark)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
