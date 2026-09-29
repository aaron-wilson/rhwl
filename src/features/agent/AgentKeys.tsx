import { Octagon } from "lucide-react";
import { formatWhen } from "../../domain/time/format";
import { formatFiat } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { Private } from "../privacy";
import { TxTitle } from "../transactions";
import type { FeedEntry, GrantedKey } from "./agent-store";
import { revokeAll, revokeKey } from "./runner";

/** Every key granted to the agent, with its next run and spend, a revoke each, and the kill switch. */
export function AgentKeys({
  keys,
  now,
}: {
  readonly keys: readonly GrantedKey[];
  readonly now: Date;
}) {
  const live = keys.filter((k) => !k.revoked);
  if (keys.length === 0) return null;
  return (
    <section aria-labelledby="agent-keys" className="flex flex-col gap-2">
      <h2 id="agent-keys" className="px-1 text-footnote font-semibold text-ink-3">
        Session keys
      </h2>
      <Card padding="list">
        <ul className="flex flex-col">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3 p-3">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-semibold">{k.prompt}</span>
                <span className="text-footnote text-ink-3">
                  {k.revoked
                    ? "Revoked"
                    : k.nextAt === undefined
                      ? "Finished"
                      : `Next run ${formatWhen(k.nextAt, now)}`}
                  {k.rule.intent === "buy" && (
                    <>
                      {" · "}
                      <Private>{formatFiat(k.spentCents)}</Private> of {formatFiat(k.rule.capCents)}
                    </>
                  )}
                </span>
              </span>
              {!k.revoked && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    revokeKey(k.id);
                  }}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
      {live.length > 0 && (
        <Button variant="destructive" block icon={<Octagon {...icon()} />} onClick={revokeAll}>
          Stop the agent
        </Button>
      )}
    </section>
  );
}

const outcomeLabel = { done: "Done", skipped: "Skipped", held: "Held", failed: "Failed" } as const;

/** What the agent did, newest first. */
export function AgentFeed({
  feed,
  now,
}: {
  readonly feed: readonly FeedEntry[];
  readonly now: Date;
}) {
  if (feed.length === 0) return null;
  return (
    <section aria-labelledby="agent-feed" className="flex flex-col gap-2">
      <h2 id="agent-feed" className="px-1 text-footnote font-semibold text-ink-3">
        Agent activity
      </h2>
      <Card padding="list">
        <ul aria-label="Agent activity" className="flex flex-col">
          {feed.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 p-3 text-footnote">
              <span className="flex justify-between gap-3">
                <span className="font-semibold">
                  {e.summary === undefined ? (
                    outcomeLabel[e.outcome]
                  ) : (
                    <TxTitle summary={e.summary} />
                  )}
                </span>
                <span className="text-ink-3">{formatWhen(e.at, now)}</span>
              </span>
              {e.note !== "" && (
                <span className="text-ink-2">
                  {e.summary === undefined ? "" : `${outcomeLabel[e.outcome]}. `}
                  {e.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
