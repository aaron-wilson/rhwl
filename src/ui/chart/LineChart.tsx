import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "../cx";
import { frameOf, indexAt, linePath, xAt, yAt } from "./geometry";

export interface LineChartProps {
  /** Values to plot, oldest first. Plotting only; money stays exact outside the chart. */
  readonly values: readonly number[];
  /** A dashed reference line, e.g. the previous close. */
  readonly baseline?: number | undefined;
  /** The scrubbed index, or undefined when not scrubbing. Controlled by the parent. */
  readonly active: number | undefined;
  readonly onActiveChange: (index: number | undefined) => void;
  readonly label: string;
  /** Screen-reader text for a point, e.g. "Sep 29, 2:30 PM, $48,213.07". */
  readonly describe: (index: number) => string;
  readonly height?: number;
  readonly className?: string;
}

/**
 * The portfolio line: draws in once, scrubs with a pointer or the arrow keys,
 * and takes its color from the market tint. Reduced motion makes the draw instant.
 */
export function LineChart({
  values,
  baseline,
  active,
  onActiveChange,
  label,
  describe,
  height = 200,
  className,
}: LineChartProps) {
  const svg = useRef<SVGSVGElement>(null);
  const frame = useMemo(() => frameOf(values, baseline), [values, baseline]);
  const path = useMemo(() => linePath(values, frame, height), [values, frame, height]);
  const last = values.length - 1;
  const current = active ?? last;
  const currentValue = values[current] ?? 0;

  function fromPointer(event: PointerEvent) {
    const rect = svg.current?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) return;
    onActiveChange(indexAt((event.clientX - rect.left) / rect.width, values.length));
  }

  function onKeyDown(event: KeyboardEvent) {
    const step = event.shiftKey ? 10 : 1;
    const moves: Partial<Record<string, number>> = {
      ArrowLeft: Math.max(0, current - step),
      ArrowRight: Math.min(last, current + step),
      Home: 0,
      End: last,
    };
    if (event.key === "Escape") {
      onActiveChange(undefined);
      return;
    }
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onActiveChange(next);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={last}
      aria-valuenow={current}
      aria-valuetext={describe(current)}
      onKeyDown={onKeyDown}
      onBlur={() => {
        onActiveChange(undefined);
      }}
      className={cx("relative touch-pan-y rounded-md select-none", className)}
    >
      <svg
        ref={svg}
        viewBox={`0 0 1000 ${height}`}
        preserveAspectRatio="none"
        className="block w-full overflow-visible text-accent"
        style={{ height: `${height}px` }}
        onPointerMove={fromPointer}
        onPointerDown={fromPointer}
        onPointerLeave={() => {
          onActiveChange(undefined);
        }}
        aria-hidden="true"
      >
        {baseline !== undefined && (
          <line
            x1={0}
            x2={1000}
            y1={yAt(baseline, frame, height)}
            y2={yAt(baseline, frame, height)}
            className="stroke-line-strong"
            strokeWidth={1}
            strokeDasharray="2 6"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path
          d={path}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="animate-chart-draw"
        />
        {active !== undefined && (
          <line
            x1={xAt(active, values.length)}
            x2={xAt(active, values.length)}
            y1={0}
            y2={height}
            className="stroke-ink-3"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-accent"
        style={{
          left: `${(xAt(current, values.length) / 1000) * 100}%`,
          top: `${yAt(currentValue, frame, height)}px`,
        }}
      />
    </div>
  );
}
