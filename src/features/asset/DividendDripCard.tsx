import type { StockToken } from "../../data/types";
import { actionSteps, dividendShares, sharesFor } from "../../domain/market/corporate-actions";
import { mulDiv, pow10, valueInCents, type Amount } from "../../domain/money/amount";
import { formatDecimal, formatFiat, formatToken } from "../../domain/money/format";
import { Card } from "../../ui/Card";
import { Private } from "../privacy";

const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

const title = {
  launch: "Launched",
  dividend: "Dividend reinvested",
  split: "Stock split",
} as const;

/**
 * The multiplier made visible: shares per token over time, and the shares a
 * balance gained from reinvested dividends without the holder doing anything.
 */
export function DividendDripCard({
  asset,
  now,
  held,
  price,
}: {
  readonly asset: StockToken;
  readonly now: Date;
  readonly held: Amount;
  readonly price: Amount;
}) {
  const steps = actionSteps(asset.actions, now);
  const multiplier = steps.at(-1)?.multiplier;
  const gainedPerToken = dividendShares(asset.actions, now);
  const gained = sharesFor(held, gainedPerToken);
  // Price of one share: the token's price divided by the shares it represents.
  const sharePrice =
    multiplier === undefined ? price : mulDiv(price, pow10(multiplier.decimals), multiplier.base);

  return (
    <section aria-labelledby="dividend-drip" className="flex flex-col gap-2">
      <h2 id="dividend-drip" className="px-1 text-footnote font-semibold text-ink-3">
        Dividend drip
      </h2>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-footnote text-ink-3">Shares per token</p>
          <p className="text-title2 font-bold tabular-nums" data-testid="shares-per-token">
            {multiplier === undefined ? "1" : formatDecimal(multiplier)}
          </p>
          <p className="text-footnote text-ink-2">
            {held.base === 0n ? (
              <>Hold {asset.symbol} and each dividend adds shares to every token automatically.</>
            ) : gained.base === 0n ? (
              <>No dividends reinvested yet. When one is, every token you hold grows.</>
            ) : (
              <>
                Your tokens gained{" "}
                <span className="font-semibold text-gain" data-testid="shares-gained">
                  <Private>{formatToken(gained, gained.base === 1n ? "share" : "shares")}</Private>
                </span>{" "}
                (<Private>{formatFiat(valueInCents(gained, sharePrice))}</Private>) from reinvested
                dividends, without you doing anything.
              </>
            )}
          </p>
        </div>
        <ol
          aria-label="Corporate actions"
          className="flex flex-col gap-3 border-l-2 border-line pl-4"
        >
          {[...steps].reverse().map((step) => (
            <li key={step.action.date} className="flex flex-col">
              <span className="text-body font-semibold">{title[step.action.kind]}</span>
              <span className="text-footnote text-ink-3 tabular-nums">
                {date.format(step.effective)} · {formatDecimal(step.multiplier)} per token
                {step.added.base > 0n && step.action.kind === "dividend"
                  ? ` (+${formatDecimal(step.added)})`
                  : ""}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
