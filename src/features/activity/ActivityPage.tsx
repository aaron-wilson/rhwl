import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { formatToken } from "../../domain/money/format";
import { formatWhen } from "../../domain/time/format";
import { statusBadge } from "./status-badge";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { ListRow } from "../../ui/ListRow";
import { PageHeader } from "../../ui/PageHeader";
import { TokenIcon } from "../../ui/TokenIcon";
import { Private } from "../privacy";
import { TxTitle } from "../transactions";
import { useActivity } from "./history";
import { useActiveAccount } from "../accounts";

export function ActivityPage() {
  const rows = useActivity(useActiveAccount());
  const now = useNow();
  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 sm:px-8">
      <PageHeader title="Activity" subtitle="Every transaction, in plain English" />
      {rows.length === 0 ? (
        <Card className="text-body text-ink-2">
          No transactions yet. Anything you send, swap or buy shows up here.
        </Card>
      ) : (
        <Card padding="list" className="flex flex-col">
          <ul aria-label="Transactions">
            {rows.map((row) => {
              const asset =
                row.headline === undefined ? undefined : assetById(row.headline.assetId);
              return (
                <li key={row.key}>
                  <ListRow
                    leading={
                      <TokenIcon symbol={asset?.symbol ?? "ETH"} splash={asset?.splash ?? "sky"} />
                    }
                    title={<TxTitle summary={row.summary} withAmount={false} />}
                    subtitle={
                      row.status === "failed" && row.error !== undefined
                        ? row.error
                        : formatWhen(row.at, now)
                    }
                    trailing={
                      row.headline === undefined || asset === undefined ? undefined : (
                        <Private>
                          {formatToken(row.headline.quantity, asset.symbol, "always")}
                        </Private>
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
    </div>
  );
}
