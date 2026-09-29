import { useProviders } from "../../app/providers-context";
import type { StockToken } from "../../data/types";
import { changeBps } from "../../domain/market/change";
import { marketState, type MarketState } from "../../domain/market/hours";
import type { Amount } from "../../domain/money/amount";
import { formatPercentBps, formatPrice } from "../../domain/money/format";
import { formatCountdown } from "../../domain/time/format";
import { Badge, type BadgeTone } from "../../ui/Badge";
import { Card } from "../../ui/Card";

const weekday = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "America/New_York",
});

function chip(state: MarketState): { tone: BadgeTone; text: string } {
  switch (state.session) {
    case "open":
      return { tone: "gain", text: "NYSE open" };
    case "pre":
      return { tone: "live", text: "Pre-market" };
    case "after":
      return { tone: "live", text: "After hours" };
    default:
      return {
        tone: "warn",
        text:
          state.reason === "weekend"
            ? "Closed for the weekend"
            : state.reason === "holiday"
              ? "Closed for a holiday"
              : "Closed overnight",
      };
  }
}

/**
 * The listing's state next to the on-chain price. While the regular session is
 * shut, the token keeps trading, so it shows the premium or discount to the
 * last official close: what the stock would gap to if the listing agreed.
 */
export function MarketClockCard({
  asset,
  now,
  price,
}: {
  readonly asset: StockToken;
  readonly now: Date;
  readonly price: Amount;
}) {
  const { market } = useProviders();
  const state = marketState(now);
  const close = market.reference(asset.id, now);
  const closeName = `${weekday.format(close.at)}'s close`;
  const gap = changeBps(price, close.price);
  const { tone, text } = chip(state);
  const countdown =
    state.closesAt === undefined
      ? `Opens in ${formatCountdown(state.nextOpen.getTime() - now.getTime())}`
      : `Closes in ${formatCountdown(state.closesAt.getTime() - now.getTime())}`;
  const relation = gap > 0n ? "premium" : gap < 0n ? "discount" : undefined;

  return (
    <section aria-labelledby="market-clock" className="flex flex-col gap-2">
      <h2 id="market-clock" className="px-1 text-footnote font-semibold text-ink-3">
        Market clock
      </h2>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone={tone}>{text}</Badge>
          <span className="text-footnote font-semibold text-ink-2 tabular-nums">{countdown}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="flex flex-col gap-1">
            <dt className="text-footnote text-ink-3">On-chain now</dt>
            <dd className="text-body font-semibold tabular-nums">{formatPrice(price)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-footnote text-ink-3">{closeName}</dt>
            <dd className="text-body font-semibold tabular-nums">{formatPrice(close.price)}</dd>
          </div>
        </dl>
        {state.session === "open" ? (
          <p className="text-footnote text-ink-2">
            The listing is trading, so the token follows it closely.
          </p>
        ) : (
          <p className="text-footnote text-ink-2" data-testid="market-gap">
            {relation === undefined ? (
              <>On-chain is in line with {closeName}.</>
            ) : (
              <>
                On-chain is at a{" "}
                <span
                  className={
                    relation === "premium" ? "font-semibold text-gain" : "font-semibold text-loss"
                  }
                >
                  {formatPercentBps(gap < 0n ? -gap : gap, "negative")} {relation}
                </span>{" "}
                to {closeName}, where the stock would open if the listing agreed.
              </>
            )}
          </p>
        )}
      </Card>
    </section>
  );
}
