import { useEffect, useState } from "react";
import { Button } from "../../ui/Button";
import { tourSteps } from "./steps";
import { endTour, tourStore } from "./tour-store";

const PAD = 8;
const FIND_MS = 3000;

interface Box {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** Waits for the step's element after navigation, scrolls it into view and keeps its box current. */
function useTarget(selector: string): Box | "missing" | undefined {
  // Tagged with its selector, so the previous step's box is never shown for the next.
  const [found, setFound] = useState<{ selector: string; box: Box | "missing" } | undefined>();
  useEffect(() => {
    const setBox = (box: Box | "missing") => {
      setFound({ selector, box });
    };
    let frame = 0;
    let element: Element | null = null;
    const started = performance.now();
    const measure = () => {
      if (element === null) return;
      const r = element.getBoundingClientRect();
      setBox({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    };
    const find = () => {
      element = document.querySelector(selector);
      if (element !== null) {
        element.scrollIntoView({ block: "center" });
        measure();
      } else if (performance.now() - started > FIND_MS) setBox("missing");
      else frame = requestAnimationFrame(find);
    };
    frame = requestAnimationFrame(find);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [selector]);
  return found?.selector === selector ? found.box : undefined;
}

/**
 * The guided tour: each step opens its page and frames one element with a
 * soft spotlight, with a card to go back, on, or out. Every step's element is
 * always on its page, so the tour cannot dead-end.
 */
export function Tour({
  step,
  navigate,
}: {
  readonly step: number;
  readonly navigate: (to: string) => void;
}) {
  const current = tourSteps[step];
  const path = current?.path ?? "/";
  useEffect(() => {
    navigate(path);
  }, [path, navigate]);
  const box = useTarget(current?.target ?? "");
  if (current === undefined) return null;
  const last = step === tourSteps.length - 1;
  return (
    <div className="pointer-events-none fixed inset-0 layer-toast">
      {box !== undefined && box !== "missing" && (
        <div
          data-testid="tour-spotlight"
          className="absolute rounded-lg ring-2 ring-accent transition-opacity duration-base"
          style={{ ...box, boxShadow: "0 0 0 9999px var(--color-scrim)" }}
        />
      )}
      <section
        role="dialog"
        aria-label="Tour"
        aria-describedby="tour-body"
        data-found={box !== undefined && box !== "missing"}
        className="pointer-events-auto absolute inset-x-4 bottom-24 mx-auto lg:bottom-4 flex max-w-sheet flex-col gap-3 rounded-xl bg-surface p-5 shadow-lg"
      >
        <p className="text-footnote text-ink-3">
          Step {step + 1} of {tourSteps.length}
        </p>
        <h2 className="text-headline font-semibold">{current.title}</h2>
        <p id="tour-body" className="text-body text-ink-2">
          {current.body}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={endTour}>
            End tour
          </Button>
          <span className="flex-1" />
          <Button
            size="sm"
            variant="secondary"
            disabled={step === 0}
            onClick={() => {
              tourStore.set(step - 1);
            }}
          >
            Back
          </Button>
          <Button
            size="sm"
            autoFocus
            onClick={() => {
              if (last) endTour();
              else tourStore.set(step + 1);
            }}
          >
            {last ? "Finish" : "Next"}
          </Button>
        </div>
      </section>
    </div>
  );
}
