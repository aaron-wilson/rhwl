/** Chart geometry in a fixed viewBox; the SVG stretches it to any size. */
export const VIEW_WIDTH = 1000;

export interface Frame {
  readonly min: number;
  readonly max: number;
}

/** Value range with a little headroom so the line never touches the edges. */
export function frameOf(values: readonly number[], baseline?: number): Frame {
  const all = baseline === undefined ? values : [...values, baseline];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = max === min ? Math.abs(max) * 0.01 || 1 : (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

export const xAt = (index: number, count: number) =>
  count <= 1 ? 0 : (index / (count - 1)) * VIEW_WIDTH;

export const yAt = (value: number, frame: Frame, height: number) =>
  height - ((value - frame.min) / (frame.max - frame.min)) * height;

/** An SVG path through every value, left to right. */
export function linePath(values: readonly number[], frame: Frame, height: number): string {
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${xAt(i, values.length).toFixed(2)},${yAt(v, frame, height).toFixed(2)}`,
    )
    .join("");
}

/** The index nearest a horizontal position, as a fraction of the chart's width. */
export function indexAt(fraction: number, count: number): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  return Math.round(clamped * (count - 1));
}
