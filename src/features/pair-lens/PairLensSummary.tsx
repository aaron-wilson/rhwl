import { Link } from "react-router";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import type { MemeToken } from "../../data/types";
import { formatFiat } from "../../domain/money/format";
import { Card } from "../../ui/Card";
import { TokenIcon } from "../../ui/TokenIcon";
import { useActiveAccount } from "../accounts";
import { assetPath } from "../asset";
import { usePosition } from "../asset";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";
import { LensSentence } from "./PairLensCard";

/** Every held meme's P&L split into its quote's move and its own, on Home. */
export function PairLensSummary() {
  const account = useActiveAccount();
  const now = useNow();
  const memes = useHoldings(account)
    .filter((h) => h.quantity.base > 0n)
    .map((h) => assetById(h.assetId))
    .filter((a): a is MemeToken => a.kind === "meme");
  if (memes.length === 0) return null;
  return (
    <section aria-labelledby="pair-lens-summary" className="flex flex-col gap-2">
      <h2 id="pair-lens-summary" className="px-1 text-footnote font-semibold text-ink-3">
        Pair Lens
      </h2>
      <Card padding="list">
        <ul className="flex flex-col">
          {memes.map((meme) => (
            <LensRow key={meme.id} account={account} meme={meme} now={now} />
          ))}
        </ul>
      </Card>
    </section>
  );
}

function LensRow({
  account,
  meme,
  now,
}: {
  readonly account: string;
  readonly meme: MemeToken;
  readonly now: Date;
}) {
  const { lens, quoteLabel } = usePosition(account, meme, now);
  if (lens === undefined || quoteLabel === undefined) return null;
  return (
    <li>
      <Link
        to={assetPath(meme)}
        className="flex items-start gap-3 rounded-md p-3 transition-colors duration-fast hover:bg-surface-2"
      >
        <TokenIcon symbol={meme.symbol} splash={meme.splash} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline justify-between gap-2 text-body font-semibold tabular-nums">
            {meme.symbol}
            <span className={lens.totalCents >= 0n ? "text-gain" : "text-loss"}>
              <Private>{formatFiat(lens.totalCents, "always")}</Private>
            </span>
          </span>
          <span className="text-footnote text-ink-2">
            <LensSentence symbol={meme.symbol} quoteLabel={quoteLabel} lens={lens} />
          </span>
        </span>
      </Link>
    </li>
  );
}
