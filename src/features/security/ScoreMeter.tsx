import { useEffect, useRef, useState } from "react";
import { duration } from "../../tokens/scale";
import { useMediaQuery } from "../../ui/useMediaQuery";

/** Counts from the last score to the new one over the draw duration; instant with reduced motion. */
function useCountUp(target: number): number {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    from.current = target;
    if (reduced || start === target) {
      setShown(target);
      return;
    }
    let frame = 0;
    let began: number | undefined;
    const step = (t: number) => {
      began ??= t;
      const k = Math.min(1, (t - began) / duration.draw);
      setShown(Math.round(start + (target - start) * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target, reduced]);
  return shown;
}

/** The score out of 100 as a number and a bar; the bar grows by transform only. */
export function ScoreMeter({ score }: { readonly score: number }) {
  const shown = useCountUp(score);
  const tone = score >= 80 ? "bg-gain" : score >= 50 ? "bg-warn" : "bg-loss";
  return (
    <div
      role="meter"
      aria-label="Security score"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className="flex flex-col gap-3"
    >
      <p className="text-footnote text-ink-2">
        <span className="text-title1 font-bold text-ink tabular-nums" data-testid="security-score">
          {shown}
        </span>{" "}
        out of 100
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full w-full origin-left transition-transform duration-draw ease-standard ${tone}`}
          style={{ transform: `scaleX(${score / 100})` }}
        />
      </div>
    </div>
  );
}
