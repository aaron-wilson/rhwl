import { formatWhen } from "../../domain/time/format";
import { sentimentBps, type RoomMessage } from "../../domain/rooms/rooms";
import { Avatar } from "../../ui/Avatar";
import { Card } from "../../ui/Card";

/** The bullish share of recent messages as a two-color bar. */
export function SentimentGauge({ messages }: { readonly messages: readonly RoomMessage[] }) {
  const bull = sentimentBps(messages);
  return (
    <Card className="flex flex-col gap-2" data-testid="sentiment">
      <div className="flex justify-between text-footnote font-semibold">
        <span className="text-gain">Bullish {Math.round(bull / 100)}%</span>
        <span className="text-loss">Bearish {100 - Math.round(bull / 100)}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-loss-soft" aria-hidden="true">
        <span className="origin-left animate-grow-x bg-gain" style={{ flexGrow: bull }} />
        <span style={{ flexGrow: 10_000 - bull }} />
      </div>
    </Card>
  );
}

/** Messages newest first. The list is a live region, so new ones are announced. */
export function RoomChat({
  messages,
  now,
}: {
  readonly messages: readonly RoomMessage[];
  readonly now: Date;
}) {
  return (
    <Card padding="list">
      <ol aria-label="Messages" aria-live="polite" className="flex flex-col">
        {messages.map((m) => (
          <li key={m.id} className="flex gap-3 p-3">
            <Avatar seed={m.handle} label={m.handle} size="sm" />
            <span className="flex min-w-0 flex-col">
              <span className="flex gap-2 text-footnote">
                <span className="font-semibold">{m.handle}</span>
                <span className="text-ink-3">{formatWhen(m.at, now)}</span>
              </span>
              <span className="text-body">{m.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
