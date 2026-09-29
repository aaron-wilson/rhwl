import type { RiskFinding } from "../../ports/simulation";
import { Badge } from "../../ui/Badge";

const tone = { info: "neutral", warning: "warn", danger: "loss" } as const;

/** What the dry run and the risk checks flagged, worst first as given. */
export function Findings({ findings }: { readonly findings: readonly RiskFinding[] }) {
  if (findings.length === 0) return null;
  return (
    <ul aria-label="Findings" className="flex flex-col gap-2">
      {findings.map((finding) => (
        <li key={finding.id} className="flex items-start gap-2 text-footnote text-ink-2">
          <Badge tone={tone[finding.severity]}>{finding.severity}</Badge>
          {finding.message}
        </li>
      ))}
    </ul>
  );
}
