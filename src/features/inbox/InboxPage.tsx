import { Bell } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";
import { useNow } from "../../app/useNow";
import { formatWhen } from "../../domain/time/format";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { TxTitle } from "../transactions";
import { markAllRead, useInbox } from "./inbox-store";

/** Everything that happened while you were elsewhere, newest first. Opening it marks all read. */
export function InboxPage() {
  const items = useInbox();
  const now = useNow(60_000);
  useEffect(() => {
    markAllRead();
  }, [items.length]);
  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <PageHeader title="Inbox" subtitle="Fills, arrivals, your agent, alerts and the market" />
      {items.length === 0 ? (
        <Card className="flex items-center gap-3 text-body text-ink-2">
          <Bell {...icon()} className="shrink-0 text-ink-3" />
          Nothing yet. Fills, bridge arrivals, agent runs and price alerts land here.
        </Card>
      ) : (
        <ul aria-label="Notifications" className="flex flex-col gap-2">
          {items.map((item) => {
            const body = (
              <Card className="flex flex-col gap-1">
                <span className="text-headline font-semibold">
                  {item.summary === undefined ? item.title : <TxTitle summary={item.summary} />}
                </span>
                {item.summary !== undefined && (
                  <span className="text-footnote text-ink-2">{item.title}</span>
                )}
                {item.detail !== undefined && (
                  <span className="text-footnote text-ink-2">{item.detail}</span>
                )}
                <span className="text-caption text-ink-3">{formatWhen(item.at, now)}</span>
              </Card>
            );
            return (
              <li key={item.id}>
                {item.to === undefined ? (
                  body
                ) : (
                  <Link to={item.to} className="block rounded-lg">
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
