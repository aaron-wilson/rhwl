import { ChevronLeft, Moon } from "lucide-react";
import { Link, useParams } from "react-router";
import { NotFoundPage } from "../../app/NotFoundPage";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import type { StockToken } from "../../data/types";
import {
  exposureChangeAtShock,
  isEarningsNight,
  totalExposure,
} from "../../domain/earnings/earnings";
import { changeBps } from "../../domain/market/change";
import { marketState } from "../../domain/market/hours";
import { formatFiat, formatPercentBps, formatPrice } from "../../domain/money/format";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { DetailRow } from "../../ui/DetailRow";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccount } from "../accounts";
import { assetBySlug, assetPath } from "../asset";
import { Private } from "../privacy";
import { WhatIfSlider } from "../whatif";
import { useExposure } from "./useEarnings";

const sessionLabel = {
  pre: "Pre-market",
  open: "Market open",
  after: "After hours",
  closed: "Closed",
} as const;

export function EarningsNightPage() {
  const { slug = "" } = useParams();
  const asset = assetBySlug(slug);
  if (asset === undefined || asset.kind !== "stock") return <NotFoundPage />;
  return <Night key={asset.id} stock={asset} />;
}

/** One report, focused: the live after-hours price and everything riding on it, with a shock slider. */
function Night({ stock }: { readonly stock: StockToken }) {
  const { market } = useProviders();
  const now = useNow();
  const exposure = useExposure(useActiveAccount(), stock, now);
  const price = market.price(stock.id, now);
  const move = changeBps(price, market.reference(stock.id, now).price);
  const tonight = isEarningsNight(stock.nextEarnings, now);
  const total = totalExposure(exposure);
  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/earnings"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Earnings
      </Link>
      <PageHeader
        title={`${stock.symbol} earnings`}
        subtitle={tonight ? "Tonight, after the close" : `Reports on ${stock.nextEarnings}`}
      />
      <Card className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="flex items-center gap-2 text-footnote text-ink-3">
            {tonight && <Moon {...icon()} />}
            {sessionLabel[marketState(now).session]} on-chain price
          </span>
          <span className="text-title1 font-bold tabular-nums" data-testid="night-price">
            {formatPrice(price)}
          </span>
        </span>
        <span className={cx("font-semibold tabular-nums", move >= 0n ? "text-gain" : "text-loss")}>
          {formatPercentBps(move)} since the close
        </span>
      </Card>
      <section aria-labelledby="exposure" className="flex flex-col gap-2">
        <h2 id="exposure" className="px-1 text-footnote font-semibold text-ink-3">
          Riding on {stock.symbol}
        </h2>
        <Card>
          <dl className="flex flex-col gap-2 text-footnote" data-testid="exposure">
            <DetailRow label={`${stock.symbol} tokens`}>
              <Private>{formatFiat(exposure.tokenCents)}</Private>
            </DetailRow>
            {exposure.memes.map((m) => (
              <DetailRow key={m.symbol} label={`${m.symbol} (paired)`}>
                <Private>{formatFiat(m.valueCents)}</Private>
              </DetailRow>
            ))}
            {exposure.perpCents !== 0n && (
              <DetailRow label={`Perps (${exposure.perpCents > 0n ? "long" : "short"})`}>
                <Private>{formatFiat(exposure.perpCents, "always")}</Private>
              </DetailRow>
            )}
            <DetailRow label="Combined">
              <span className="font-semibold">
                <Private>{formatFiat(total)}</Private>
              </span>
            </DetailRow>
          </dl>
        </Card>
      </section>
      <WhatIfSlider
        subject={stock.symbol}
        outcome={(bps) => {
          const change = exposureChangeAtShock(exposure, bps);
          return (
            <span>
              Everything riding on {stock.symbol} moves{" "}
              <span className={change >= 0n ? "text-gain" : "text-loss"}>
                <Private>{formatFiat(change, "always")}</Private>
              </span>
              , if paired memes hold their pairs.
            </span>
          );
        }}
      />
      <Link to={assetPath(stock)} className="self-start text-footnote font-semibold text-accent">
        {stock.symbol} page <Badge>{stock.exchange}</Badge>
      </Link>
    </div>
  );
}
