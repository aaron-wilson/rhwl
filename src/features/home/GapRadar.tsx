import { ChevronRight } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { gapSince } from "../../domain/market/gap";
import { lastClose, marketState, type MarketState } from "../../domain/market/hours";
import { formatFiat, formatPercentBps } from "../../domain/money/format";
import { formatCountdown } from "../../domain/time/format";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";

const GapSheet = lazy(async () => ({ default: (await import("./GapSheet")).GapSheet }));

const weekday = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "America/New_York",
});

function titleFor(state: MarketState): string {
  if (state.session === "pre") return "Pre-market gap";
  if (state.session === "after") return "After-hours gap";
  if (state.reason === "weekend") return "Weekend gap";
  if (state.reason === "holiday") return "Holiday gap";
  return "Overnight gap";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * While the listing is shut, how far the stock-linked part of the portfolio has
 * drifted from the last close: what it would gap into at the next open.
 * Hidden during the regular session and when nothing held is stock-linked.
 */
export function GapRadar() {
  const { market } = useProviders();
  const now = useNow();
  const holdings = useHoldings(useActiveAccount());
  const [open, setOpen] = useState(false);
  const state = marketState(now);
  const closedAt = lastClose(now);
  const gap = useMemo(
    () =>
      gapSince(
        holdings,
        assetById,
        (id) => market.price(id, closedAt),
        (id) => market.price(id, now),
      ),
    [holdings, market, closedAt, now],
  );

  if (state.session === "open") return null;
  const count = gap.stocks.length + gap.pairedMemes.length;
  if (count === 0) return null;
  const up = gap.total.cents >= 0n;
  const title = titleFor(state);
  const since = `${weekday.format(closedAt)}'s close`;

  return (
    <section aria-label={title}>
      <Card interactive padding="none">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          className="flex w-full flex-col gap-3 rounded-lg p-4 text-left"
        >
          <span className="flex w-full items-center justify-between gap-2">
            <span className="text-headline font-semibold">{title}</span>
            <span className="text-footnote text-ink-3 tabular-nums">
              Opens in {formatCountdown(state.nextOpen.getTime() - now.getTime())}
            </span>
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={up ? "text-title2 font-bold text-gain" : "text-title2 font-bold text-loss"}
              data-testid="gap-total"
            >
              <Private>{formatFiat(gap.total.cents, "always")}</Private>
            </span>
            <span
              className={
                up ? "text-body font-semibold text-gain" : "text-body font-semibold text-loss"
              }
            >
              {formatPercentBps(gap.total.bps)}
            </span>
            <span className="text-footnote text-ink-2">since {since}</span>
          </span>
          <span className="flex w-full items-center justify-between gap-2 text-footnote text-ink-2">
            <span>
              {plural(gap.stocks.length, "stock token", "stock tokens")}
              {gap.pairedMemes.length > 0 &&
                `, ${plural(gap.pairedMemes.length, "paired meme", "paired memes")}`}{" "}
              drifting from the listing
            </span>
            <ChevronRight {...icon()} className="text-ink-3" />
          </span>
        </button>
      </Card>
      {open && (
        <Suspense fallback={null}>
          <GapSheet
            title={title}
            since={since}
            gap={gap}
            onClose={() => {
              setOpen(false);
            }}
          />
        </Suspense>
      )}
    </section>
  );
}
