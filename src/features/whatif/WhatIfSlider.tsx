import { useId, useState, type ReactNode } from "react";
import { SHOCK_MAX_BPS, SHOCK_MIN_BPS } from "../../domain/whatif";
import { Slider } from "../../ui/Slider";

const toLabel = (pct: number) => `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}%`;

/**
 * Drag a price shock from −30% to +30% and see the outcome, recomputed on
 * every move and announced politely. Every review sheet uses this one control.
 */
export function WhatIfSlider({
  subject,
  outcome,
}: {
  /** What is shocked, e.g. "NVDA" or "the stock tokens". */
  readonly subject: string;
  readonly outcome: (shockBps: number) => ReactNode;
}) {
  const [pct, setPct] = useState(0);
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-md bg-surface-2 p-3">
      <h3 id={id} className="text-footnote font-semibold text-ink-3">
        What if: {subject} {toLabel(pct)}
      </h3>
      <Slider
        label={`Price shock for ${subject}`}
        value={pct}
        min={SHOCK_MIN_BPS / 100}
        max={SHOCK_MAX_BPS / 100}
        onChange={setPct}
        format={toLabel}
        marks={[SHOCK_MIN_BPS / 100, 0, SHOCK_MAX_BPS / 100]}
      />
      <div aria-live="polite" className="text-footnote text-ink-2" data-testid="whatif-outcome">
        {outcome(pct * 100)}
      </div>
    </section>
  );
}
