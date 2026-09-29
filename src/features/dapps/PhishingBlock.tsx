import { ShieldAlert } from "lucide-react";
import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import type { RiskFinding } from "../../ports/simulation";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";

interface PhishingBlockProps {
  readonly origin: string;
  readonly finding: RiskFinding;
  readonly onProceed: () => void;
}

/**
 * Stands in front of a lookalike site. Leaving is one tap; staying takes a
 * deliberate choice. Rendered on the body: the page's fade-in transform would
 * otherwise become the containing block and clip a fixed element.
 */
export function PhishingBlock({ origin, finding, onProceed }: PhishingBlockProps) {
  const [understood, setUnderstood] = useState(false);
  const id = useId();
  return createPortal(
    <section
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      className="fixed inset-0 layer-sheet flex overflow-y-auto bg-loss-soft px-6 py-10"
    >
      <div className="m-auto flex flex-col items-center gap-5 text-center">
        <ShieldAlert {...icon("lg")} className="text-loss" />
        <h1 id={`${id}-title`} className="text-title1 font-bold text-ink">
          Deceptive site ahead
        </h1>
        <p id={`${id}-body`} className="max-w-phone text-body text-ink">
          {finding.message}
        </p>
        <Link
          to="/browse"
          className="rounded-full bg-accent px-6 py-3 text-headline font-semibold text-on-accent"
        >
          Back to safety
        </Link>
        <details className="max-w-phone text-left text-footnote text-ink-2">
          <summary className="cursor-pointer text-center font-semibold">I know the risk</summary>
          <label className="mt-3 flex items-start gap-2">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => {
                setUnderstood(e.target.checked);
              }}
            />
            I understand {origin} may take everything this account can sign away.
          </label>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            disabled={!understood}
            onClick={onProceed}
          >
            Proceed anyway
          </Button>
        </details>
      </div>
    </section>,
    document.body,
  );
}
