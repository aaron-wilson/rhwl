import { ChevronLeft } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { setTint } from "../../app/tint";
import { useNow } from "../../app/useNow";
import { aboutAsset } from "../../data/about";
import type { Asset } from "../../data/types";
import { changeBps } from "../../domain/market/change";
import { formatPercentBps, formatPrice } from "../../domain/money/format";
import { formatWhen } from "../../domain/time/format";
import { Card } from "../../ui/Card";
import { LineChart } from "../../ui/chart/LineChart";
import { icon } from "../../ui/icon";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { NotFoundPage } from "../../app/NotFoundPage";
import { useActiveAccount } from "../accounts";
import { ranges, type RangeKey } from "../home";
import type { Side } from "../../domain/trade/order";
import { useLaunch } from "../launch";
import { AlertsCard } from "../alerts";
import { PairLensCard } from "../pair-lens";
import { AssetActions } from "./AssetActions";
import { AssetActivity } from "./AssetActivity";
import { AssetHeader } from "./AssetHeader";
import { assetBySlug } from "./asset-path";
import { AssetStats } from "./AssetStats";
import { DividendDripCard } from "./DividendDripCard";
import { MarketClockCard } from "./MarketClockCard";
import { PositionCard } from "./PositionCard";
import { RugRadarCard } from "./RugRadarCard";
import { usePosition } from "./usePosition";
import { usePriceChart } from "./usePriceChart";

const LaunchSheet = lazy(async () => ({
  default: (await import("../launch/LaunchSheet")).LaunchSheet,
}));
const FlexSheet = lazy(async () => ({ default: (await import("../flex/FlexSheet")).FlexSheet }));
const TradeSheet = lazy(async () => ({ default: (await import("./TradeSheet")).TradeSheet }));

export function AssetPage() {
  const { slug = "" } = useParams();
  const asset = assetBySlug(slug);
  if (asset === undefined) return <NotFoundPage />;
  return <AssetDetail key={asset.id} asset={asset} />;
}

function AssetDetail({ asset }: { readonly asset: Asset }) {
  const [range, setRange] = useState<RangeKey>("1D");
  const [active, setActive] = useState<number | undefined>(undefined);
  const [trading, setTrading] = useState<Side | undefined>(undefined);
  const [flexing, setFlexing] = useState(false);
  const onChain = asset.chain === "robinhood";
  const launch = useLaunch(asset.id);
  const onCurve = launch !== undefined && !launch.graduated;
  const tradable = onChain && (asset.kind === "stock" || asset.kind === "crypto" || onCurve);
  const now = useNow();
  const chart = usePriceChart(asset, range, now);
  const position = usePosition(useActiveAccount(), asset, now);
  const up = chart.changeBps >= 0n;

  useEffect(() => {
    setTint(up ? "gain" : "loss");
  }, [up]);

  const lastTime = chart.points.at(-1)?.at ?? now;
  const scrubbed = active === undefined ? undefined : chart.points[active];
  const shown = scrubbed?.price ?? chart.price;
  const phrase =
    range === "1D"
      ? asset.kind === "stock"
        ? "since last close"
        : "past 24 hours"
      : (ranges.find((r) => r.key === range)?.phrase ?? "");
  const caption = scrubbed === undefined ? phrase : formatWhen(scrubbed.at, lastTime);
  const shownBps = scrubbed === undefined ? chart.changeBps : changeBps(shown, chart.from);
  const describe = (i: number) => {
    const point = chart.points[i];
    return point === undefined
      ? ""
      : `${formatWhen(point.at, lastTime)}, ${formatPrice(point.price)}`;
  };

  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 pt-4 sm:px-8">
      <Link
        to="/"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Home
      </Link>
      <AssetHeader asset={asset} />
      <section aria-label="Price" className="flex flex-col gap-2">
        <p className="text-large font-bold tabular-nums sm:text-display" data-testid="asset-price">
          {formatPrice(shown)}
        </p>
        <p className="flex items-center gap-2" aria-live="polite">
          <span
            className={
              shownBps >= 0n
                ? "text-footnote font-semibold text-gain"
                : "text-footnote font-semibold text-loss"
            }
          >
            {formatPercentBps(shownBps)}
          </span>
          <span className="text-footnote text-ink-2">{caption}</span>
        </p>
      </section>
      <div className="flex flex-col gap-3">
        <LineChart
          values={chart.values}
          baseline={
            range === "1D" ? Number(chart.from.base) / 10 ** chart.from.decimals : undefined
          }
          active={active}
          onActiveChange={setActive}
          label={`${asset.name} price, ${phrase}`}
          describe={describe}
        />
        <SegmentedControl
          label="Chart range"
          options={ranges.map((r) => ({ value: r.key, label: r.label }))}
          value={range}
          onChange={(next) => {
            setActive(undefined);
            setRange(next);
          }}
        />
      </div>
      <AssetActions asset={asset} tradable={tradable} onChain={onChain} onTrade={setTrading} />
      {trading !== undefined && asset.kind === "meme" && (
        <Suspense fallback={null}>
          <LaunchSheet
            meme={asset}
            initialSide={trading}
            onClose={() => {
              setTrading(undefined);
            }}
          />
        </Suspense>
      )}
      {trading !== undefined && asset.kind !== "meme" && (
        <Suspense fallback={null}>
          <TradeSheet
            asset={asset}
            basis={position.basis}
            side={trading}
            onClose={() => {
              setTrading(undefined);
            }}
          />
        </Suspense>
      )}
      {asset.kind === "stock" && (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
          <MarketClockCard asset={asset} now={now} price={chart.price} />
          <DividendDripCard asset={asset} now={now} held={position.quantity} price={chart.price} />
        </div>
      )}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <PositionCard
            asset={asset}
            position={position}
            onFlex={() => {
              setFlexing(true);
            }}
          />
          <section aria-labelledby="asset-about" className="flex flex-col gap-2">
            <h2 id="asset-about" className="px-1 text-footnote font-semibold text-ink-3">
              About
            </h2>
            <Card className="text-body text-ink-2">{aboutAsset(asset)}</Card>
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <AssetStats asset={asset} dayLow={chart.dayLow} dayHigh={chart.dayHigh} />
          <AlertsCard assetId={asset.id} symbol={asset.symbol} />
          {asset.kind === "meme" && position.quoteLabel !== undefined && (
            <PairLensCard
              symbol={asset.symbol}
              quoteLabel={position.quoteLabel}
              lens={position.lens}
            />
          )}
          {asset.kind === "meme" && <RugRadarCard assetId={asset.id} />}
        </div>
      </div>
      <AssetActivity asset={asset} rows={position.activity} now={now} />
      {flexing && (
        <Suspense fallback={null}>
          <FlexSheet
            asset={asset}
            position={position}
            onClose={() => {
              setFlexing(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
