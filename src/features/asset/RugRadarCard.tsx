import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { Verdict } from "../../domain/memes/rug-radar";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { icon } from "../../ui/icon";
import { useLaunch } from "../launch";
import { radarFor } from "../launch";

const verdictIcon: Record<Verdict, { Icon: typeof CircleCheck; className: string; label: string }> =
  {
    good: { Icon: CircleCheck, className: "text-gain", label: "Good" },
    caution: { Icon: TriangleAlert, className: "text-warn", label: "Caution" },
    danger: { Icon: CircleAlert, className: "text-loss", label: "Danger" },
  };

/** A meme's rug risk: a grade from A to F and the finding behind each factor. */
export function RugRadarCard({ assetId }: { readonly assetId: string }) {
  const launch = useLaunch(assetId);
  if (launch === undefined) return null;
  const radar = radarFor(launch);
  return (
    <section aria-labelledby="rug-radar" className="flex flex-col gap-2">
      <h2 id="rug-radar" className="px-1 text-footnote font-semibold text-ink-3">
        Rug Radar
      </h2>
      <Card className="flex flex-col gap-4">
        <p className="flex items-center gap-3" data-testid="rug-grade">
          <span
            className={cx(
              "flex size-12 items-center justify-center rounded-full text-title1 font-bold",
              radar.grade === "A" || radar.grade === "B"
                ? "bg-gain-soft text-gain"
                : radar.grade === "C"
                  ? "bg-warn-soft text-warn"
                  : "bg-loss-soft text-loss",
            )}
            aria-label={`Grade ${radar.grade}`}
          >
            {radar.grade}
          </span>
          <span className="flex flex-col">
            <span className="text-headline font-semibold tabular-nums">{radar.score} of 100</span>
            <span className="text-footnote text-ink-3">Higher is safer. Not financial advice.</span>
          </span>
        </p>
        <ul className="flex flex-col gap-3">
          {radar.findings.map((f) => {
            const { Icon, className, label } = verdictIcon[f.verdict];
            return (
              <li key={f.factor} className="flex items-start gap-3">
                <span className={cx("mt-px", className)} aria-label={label} role="img">
                  <Icon {...icon("sm")} />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-body font-semibold">{f.factor}</span>
                  <span className="text-footnote text-ink-2">{f.message}</span>
                </span>
                {f.penalty > 0 && (
                  <Badge tone={f.verdict === "danger" ? "loss" : "warn"}>−{f.penalty}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
