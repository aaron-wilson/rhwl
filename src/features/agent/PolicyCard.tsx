import { assetById } from "../../data/assets";
import { describeRule } from "../../domain/agent/describe";
import type { AgentRule } from "../../domain/agent/rule";
import { Card } from "../../ui/Card";

/** A compiled rule, row by row: exactly what the session key will allow. */
export function PolicyCard({ rule }: { readonly rule: AgentRule }) {
  return (
    <Card className="flex flex-col gap-3" data-testid="policy-card">
      <dl className="flex flex-col gap-2 text-footnote">
        {describeRule(rule, (id) => assetById(id).symbol).map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt className="text-ink-3">{row.label}</dt>
            <dd className="text-right font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
