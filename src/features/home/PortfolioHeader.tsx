import { Eye, EyeOff } from "lucide-react";
import { formatFiat, formatPercentBps } from "../../domain/money/format";
import type { Change } from "../../domain/portfolio/portfolio";
import { Badge } from "../../ui/Badge";
import { icon } from "../../ui/icon";
import { Private } from "../privacy";
import { toggleBalancesHidden, useBalancesHidden } from "../privacy";

interface PortfolioHeaderProps {
  readonly valueCents: bigint;
  readonly change: Change;
  /** "today", "past week", or the scrubbed moment. */
  readonly caption: string;
}

/** The big number. Tapping it hides every amount in the app. */
export function PortfolioHeader({ valueCents, change, caption }: PortfolioHeaderProps) {
  const hidden = useBalancesHidden();
  const up = change.cents >= 0n;
  return (
    <section aria-label="Portfolio" className="flex flex-col gap-2">
      <h1 className="text-footnote font-semibold text-ink-3">Portfolio</h1>
      <button
        type="button"
        onClick={toggleBalancesHidden}
        aria-pressed={hidden}
        className="group flex items-center gap-3 self-start rounded-md text-left"
      >
        <span
          className="text-large font-bold tabular-nums sm:text-display"
          data-testid="portfolio-total"
        >
          <Private>{formatFiat(valueCents)}</Private>
        </span>{" "}
        <span className="sr-only">Hide balances</span>
        {hidden ? (
          <EyeOff {...icon()} className="text-ink-3" />
        ) : (
          <Eye
            {...icon()}
            className="text-ink-3 opacity-0 transition-opacity duration-fast group-hover:opacity-100"
          />
        )}
      </button>
      <div className="flex items-center gap-2" aria-live="polite">
        <Badge tone={up ? "gain" : "loss"}>
          <Private>{formatFiat(change.cents, "always")}</Private>
        </Badge>
        <span
          className={
            up ? "text-footnote font-semibold text-gain" : "text-footnote font-semibold text-loss"
          }
        >
          {formatPercentBps(change.bps)}
        </span>
        <span className="text-footnote text-ink-2">{caption}</span>
      </div>
    </section>
  );
}
