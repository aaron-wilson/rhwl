import { X } from "lucide-react";
import type { ChangeEvent } from "react";
import { HONESTY_LINE } from "../../data/honesty";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { startTour } from "../../features/tour/tour-store";
import { setPhoneFrame, togglePresenter } from "../presenter";
import { useProviders } from "../providers-context";
import { scenarios } from "../startup";

const steps = [
  { label: "+5 s", name: "Advance the clock 5 seconds", ms: 5000 },
  { label: "+1 h", name: "Advance the clock 1 hour", ms: 3_600_000 },
  { label: "+1 d", name: "Advance the clock 1 day", ms: 86_400_000 },
] as const;

const title = (key: string) => key.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Opens a scenario in one step: a fresh load at its moment and seed, presenter mode still on. */
function openScenario(event: ChangeEvent<HTMLSelectElement>): void {
  if (event.target.value === "") return;
  const params = new URLSearchParams(window.location.search);
  params.set("scenario", event.target.value);
  params.set("presenter", "1");
  params.delete("at");
  params.delete("seed");
  window.location.assign(`/?${params.toString()}`);
}

interface PresenterBarProps {
  /** Inside the phone frame there is no frame to switch to. */
  readonly framed: boolean;
  readonly scenario: string | undefined;
}

/**
 * Presenter mode: jump to any scenario, step the demo clock on cue, and show
 * the app in a phone frame for screen sharing. A sticky strip, so it covers
 * nothing. Toggle it with ⌘. / Ctrl-. or a long press on the logo.
 */
export function PresenterBar({ framed, scenario }: PresenterBarProps) {
  const { demo } = useProviders();
  return (
    <section
      aria-label="Presenter controls"
      className="sticky top-0 layer-nav flex flex-wrap items-center justify-center gap-1 border-b border-line bg-chrome p-1 backdrop-blur-chrome"
    >
      <select
        aria-label="Scenario"
        value={scenario ?? ""}
        onChange={openScenario}
        className="h-8 rounded-full bg-surface-2 px-3 text-footnote"
      >
        <option value="">Scenario…</option>
        {Object.keys(scenarios).map((key) => (
          <option key={key} value={key}>
            {title(key)}
          </option>
        ))}
      </select>
      {demo !== undefined &&
        steps.map((step) => (
          <Button
            key={step.label}
            size="sm"
            variant="secondary"
            aria-label={step.name}
            onClick={() => {
              demo.advanceClock(step.ms);
            }}
          >
            {step.label}
          </Button>
        ))}
      {demo !== undefined && (
        <Button
          size="sm"
          variant="ghost"
          aria-label="Run the clock live from here"
          onClick={() => {
            demo.resumeClock();
          }}
        >
          Now
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={startTour}>
        Tour
      </Button>
      {!framed && (
        <Button
          size="sm"
          variant="ghost"
          className="hidden lg:inline-flex"
          onClick={() => {
            setPhoneFrame(true);
          }}
        >
          Phone frame
        </Button>
      )}
      <Button size="sm" variant="ghost" aria-label="Leave presenter mode" onClick={togglePresenter}>
        <X {...icon("sm")} />
      </Button>
      <p className="basis-full text-center text-caption text-ink-3 lg:basis-auto lg:px-2">
        {HONESTY_LINE}
      </p>
    </section>
  );
}
