import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { isEarningsNight } from "../../domain/earnings/earnings";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { ListRow } from "../../ui/ListRow";
import { PageHeader } from "../../ui/PageHeader";
import { TokenIcon } from "../../ui/TokenIcon";
import { useActiveAccount } from "../accounts";
import { useEarningsCalendar } from "./useEarnings";

const day = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** Upcoming reports for what you hold, including stocks your memes are paired to. */
export function EarningsPage() {
  const now = useNow(60_000);
  const entries = useEarningsCalendar(useActiveAccount(), now);
  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/trade"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Trade
      </Link>
      <PageHeader title="Earnings" subtitle="Reports that move what you hold" />
      {entries.length === 0 ? (
        <Card className="text-body text-ink-2">
          Nothing you hold reports soon. Stock Tokens and memes paired to them show up here.
        </Card>
      ) : (
        <Card padding="list">
          <ul aria-label="Earnings calendar">
            {entries.map((e) => {
              const asset = assetById(e.assetId);
              const tonight = isEarningsNight(e.date, now);
              return (
                <li key={e.assetId}>
                  <Link
                    to={`/earnings/${e.assetId.replace(":", "-")}`}
                    className="block rounded-md hover:bg-surface-2"
                  >
                    <ListRow
                      leading={
                        <TokenIcon
                          symbol={asset.symbol}
                          splash={asset.splash}
                          size="sm"
                          badge="S"
                        />
                      }
                      title={asset.symbol}
                      subtitle={[
                        e.held ? "Held" : undefined,
                        e.pairedMemes.length > 0
                          ? `Paired: ${e.pairedMemes.join(", ")}`
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      trailing={
                        tonight ? (
                          <Badge tone="live">Tonight</Badge>
                        ) : (
                          day.format(new Date(`${e.date}T12:00:00Z`))
                        )
                      }
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
