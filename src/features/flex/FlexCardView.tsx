import type { FlexCard } from "../../domain/flex/card";
import { formatFiat, formatPercentBps, formatPrice } from "../../domain/money/format";
import { cx } from "../../ui/cx";
import { TokenIcon } from "../../ui/TokenIcon";

const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

/** The card as anyone sees it: the numbers exactly as signed, nothing the viewer's own state adds. */
export function FlexCardView({
  card,
  footer,
}: {
  readonly card: FlexCard;
  readonly footer: React.ReactNode;
}) {
  const up = card.pnlBps >= 0n;
  return (
    <figure
      aria-label={`${card.symbol} position card`}
      className={cx(
        "flex flex-col gap-4 rounded-lg border p-6 shadow-md",
        up ? "border-gain bg-gain-soft" : "border-loss bg-loss-soft",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-headline font-semibold">
          <TokenIcon symbol={card.symbol} size="sm" />
          {card.symbol}
        </span>
        <span className="text-footnote text-ink-2">{card.accountName}</span>
      </div>
      <p
        className={cx("text-display font-bold tabular-nums", up ? "text-gain" : "text-loss")}
        data-testid="flex-pnl"
      >
        {formatPercentBps(card.pnlBps)}
      </p>
      <dl className="grid grid-cols-3 gap-3 text-footnote">
        <div className="flex flex-col">
          <dt className="text-ink-3">P&amp;L</dt>
          <dd className="font-semibold tabular-nums">
            {card.pnlCents === undefined ? "Not shown" : formatFiat(card.pnlCents, "always")}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-ink-3">Entry</dt>
          <dd className="font-semibold tabular-nums">{formatPrice(card.entry)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-ink-3">Mark</dt>
          <dd className="font-semibold tabular-nums">{formatPrice(card.mark)}</dd>
        </div>
      </dl>
      <figcaption className="flex items-center justify-between gap-3 text-caption text-ink-3">
        <span>{day.format(card.at)}</span>
        {footer}
      </figcaption>
    </figure>
  );
}
