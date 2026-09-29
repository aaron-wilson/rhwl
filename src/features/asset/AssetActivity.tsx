import type { Asset } from "../../data/types";
import { formatToken } from "../../domain/money/format";
import { formatWhen } from "../../domain/time/format";
import { statusBadge } from "../activity";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { ListRow } from "../../ui/ListRow";
import type { ActivityRow } from "../activity";
import { Private } from "../privacy";
import { TxTitle } from "../transactions";

/** The account's transactions that moved this asset, each showing the change to it. */
export function AssetActivity({
  asset,
  rows,
  now,
}: {
  readonly asset: Asset;
  readonly rows: readonly ActivityRow[];
  readonly now: Date;
}) {
  return (
    <section aria-labelledby="asset-activity" className="flex flex-col gap-2">
      <h2 id="asset-activity" className="px-1 text-footnote font-semibold text-ink-3">
        Activity
      </h2>
      {rows.length === 0 ? (
        <Card className="text-body text-ink-2">No {asset.symbol} transactions yet.</Card>
      ) : (
        <Card padding="list" className="flex flex-col">
          <ul aria-label={`${asset.symbol} transactions`}>
            {rows.map((row) => {
              const effect = row.effects.find((e) => e.assetId === asset.id);
              return (
                <li key={row.key}>
                  <ListRow
                    title={<TxTitle summary={row.summary} withAmount={false} />}
                    subtitle={
                      row.status === "failed" && row.error !== undefined
                        ? row.error
                        : formatWhen(row.at, now)
                    }
                    trailing={
                      effect === undefined ? undefined : (
                        <Private>{formatToken(effect.quantity, asset.symbol, "always")}</Private>
                      )
                    }
                    trailingSub={
                      <Badge tone={statusBadge[row.status].tone}>
                        {statusBadge[row.status].text}
                      </Badge>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
