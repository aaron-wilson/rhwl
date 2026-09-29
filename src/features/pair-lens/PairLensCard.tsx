import type { PairLens } from "../../domain/pair-lens";
import { formatFiat, formatPercentBps } from "../../domain/money/format";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { Private } from "../privacy";

const abs = (n: bigint) => (n < 0n ? -n : n);

/**
 * A stock-paired meme's P&L split into the quote's move (beta) and the meme's
 * own (alpha): a stacked bar and one plain sentence.
 */
export function PairLensCard({
  symbol,
  quoteLabel,
  lens,
}: {
  readonly symbol: string;
  readonly quoteLabel: string;
  readonly lens: PairLens | undefined;
}) {
  return (
    <section aria-labelledby="pair-lens" className="flex flex-col gap-2">
      <h2 id="pair-lens" className="px-1 text-footnote font-semibold text-ink-3">
        Pair Lens
      </h2>
      <Card className="flex flex-col gap-4" data-testid="pair-lens">
        {lens === undefined ? (
          <p className="text-body text-ink-2">
            Hold {symbol} to see how much of its move is {quoteLabel} and how much is its own.
          </p>
        ) : (
          <LensBody symbol={symbol} quoteLabel={quoteLabel} lens={lens} />
        )}
      </Card>
    </section>
  );
}

function LensBody({
  symbol,
  quoteLabel,
  lens,
}: {
  readonly symbol: string;
  readonly quoteLabel: string;
  readonly lens: PairLens;
}) {
  const weight = abs(lens.betaCents) + abs(lens.alphaCents);
  const share = (part: bigint) =>
    weight === 0n ? 0.5 : Number((abs(part) * 1000n) / weight) / 1000;
  const parts = [
    { key: "beta", label: `${quoteLabel}'s move`, cents: lens.betaCents, soft: true },
    { key: "alpha", label: `${symbol}'s own move`, cents: lens.alphaCents, soft: false },
  ] as const;
  return (
    <>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        {parts.map((p) => (
          <span
            key={p.key}
            style={{ flexGrow: share(p.cents) }}
            className={cx(
              "origin-left animate-grow-x",
              p.cents >= 0n
                ? p.soft
                  ? "bg-gain-soft"
                  : "bg-gain"
                : p.soft
                  ? "bg-loss-soft"
                  : "bg-loss",
            )}
          />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
        {parts.map((p) => (
          <div key={p.key} className="flex flex-col">
            <dt className="text-footnote text-ink-3">{p.label}</dt>
            <dd
              className={cx(
                "text-headline font-semibold tabular-nums",
                p.cents >= 0n ? "text-gain" : "text-loss",
              )}
            >
              <Private>{formatFiat(p.cents, "always")}</Private>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-body text-ink-2" data-testid="pair-lens-sentence">
        <LensSentence symbol={symbol} quoteLabel={quoteLabel} lens={lens} />
      </p>
    </>
  );
}

/** "NVDA moved +6.10% since you bought, worth +$80.00. CHIPDOG added +$332.00 on top." */
export function LensSentence({
  symbol,
  quoteLabel,
  lens,
}: {
  readonly symbol: string;
  readonly quoteLabel: string;
  readonly lens: PairLens;
}) {
  return (
    <>
      {quoteLabel} moved {formatPercentBps(lens.quoteBps)} since you bought, worth{" "}
      <Private>{formatFiat(lens.betaCents, "always")}</Private>. {symbol}{" "}
      {lens.alphaCents >= 0n ? "added" : "gave back"}{" "}
      <Private>{formatFiat(abs(lens.alphaCents))}</Private>{" "}
      {lens.alphaCents >= 0n ? "on top" : "of it"}.
    </>
  );
}
