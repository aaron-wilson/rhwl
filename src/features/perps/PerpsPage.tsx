import { ChevronLeft } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { perpMarketById, perpMarkets } from "../../data/perps";
import { changeBps } from "../../domain/market/change";
import { amount, parseAmount } from "../../domain/money/amount";
import { formatFiat, formatPercentBps, formatPrice, formatToken } from "../../domain/money/format";
import {
  checkTriggers,
  liquidationPrice,
  notionalCents,
  type PerpSide,
} from "../../domain/perps/position";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Slider } from "../../ui/Slider";
import { DetailRow } from "../../ui/DetailRow";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";
import { funding, inputClass, optionalPrice } from "./perp-form";
import { TriggerInputs } from "./PerpControls";
import { MarketPicker } from "./PerpsMarkets";
import { PerpWhatIf } from "../whatif";
import { PerpsPositions } from "./PerpsPositions";
import { openPosition, usePositions, watchPositions } from "./perps-store";

/** USDG-margined perps: pick a market, go long or short with leverage, manage positions live. */
export function PerpsPage() {
  const providers = useProviders();
  const account = useActiveAccount();
  const holdings = useHoldings(account);
  const positions = usePositions().filter((p) => p.account === account);
  const [params, setParams] = useSearchParams();
  const market = perpMarketById(params.get("market") ?? "") ?? perpMarkets[0];
  const [side, setSide] = useState<PerpSide>("long");
  const [collateralText, setCollateralText] = useState("");
  const [leverage, setLeverage] = useState(5);
  const [tpText, setTpText] = useState("");
  const [slText, setSlText] = useState("");
  const [sending, setSending] = useState(false);
  const ids = { collateral: useId(), tp: useId(), sl: useId() };
  const now = useNow(5_000);

  // The exchange watches positions on every tick: liquidations and trigger orders.
  useEffect(() => {
    watchPositions(providers, now);
  }, [providers, now]);

  if (market === undefined) return null;
  const asset = assetById(market.assetId);
  const mark = providers.market.price(asset.id, now);
  const dayChange = changeBps(mark, providers.market.reference(asset.id, now).price);
  const lev = Math.min(leverage, market.maxLeverage);
  const cash = holdings.find((h) => h.assetId === "rh:USDG")?.quantity ?? amount(0n, 6);
  const collateral = parseAmount(collateralText.trim(), 2);
  const collateralCents =
    collateral !== undefined && collateral.base > 0n ? collateral.base : undefined;
  const tp = optionalPrice(tpText);
  const sl = optionalPrice(slText);
  const triggerProblem =
    tp === "invalid" || sl === "invalid"
      ? "Enter prices as dollars, like 3,400"
      : checkTriggers(side, mark, tp, sl);
  const short = collateralCents !== undefined && collateralCents * 10_000n > cash.base;
  const preview =
    collateralCents === undefined
      ? undefined
      : { side, leverage: lev, entryPrice: mark, collateralCents, openedAt: now };
  const ready = preview !== undefined && !short && triggerProblem === undefined && !sending;

  async function open() {
    if (preview === undefined || market === undefined || tp === "invalid" || sl === "invalid")
      return;
    setSending(true);
    const ok = await openPosition(providers, {
      account,
      market,
      side,
      collateralCents: preview.collateralCents,
      leverage: lev,
      takeProfit: tp,
      stopLoss: sl,
    });
    setSending(false);
    if (ok) {
      setCollateralText("");
      setTpText("");
      setSlText("");
    }
  }

  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 pt-4 pb-8 sm:px-8">
      <Link
        to="/trade"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Trade
      </Link>
      <PageHeader title="Perps" subtitle="Margined and settled in USDG, around the clock" />
      <MarketPicker
        selected={market.id}
        onSelect={(m) => {
          setParams({ market: m.id }, { replace: true });
          setLeverage((l) => Math.min(l, m.maxLeverage));
        }}
      />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
        <Card className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-footnote text-ink-3">{market.id} mark</span>
              <span className="text-title2 font-bold tabular-nums" data-testid="perp-mark">
                {formatPrice(mark)}
              </span>
            </div>
            <div className="flex flex-col items-end text-footnote">
              <span className={dayChange >= 0n ? "text-gain" : "text-loss"}>
                {formatPercentBps(dayChange)}
              </span>
              <span className="text-ink-3">Funding {funding(market.fundingCentiBps)}</span>
            </div>
          </div>
          <SegmentedControl
            label="Side"
            options={[
              { value: "long", label: "Long" },
              { value: "short", label: "Short" },
            ]}
            value={side}
            onChange={setSide}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.collateral} className="text-footnote text-ink-3">
              Margin in USDG
            </label>
            <input
              id={ids.collateral}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={collateralText}
              onChange={(event) => {
                setCollateralText(event.target.value);
              }}
              className={inputClass}
            />
            <span className="text-footnote text-ink-3">
              Available <Private>{formatToken(cash, "USDG")}</Private>
            </span>
          </div>
          <Slider
            label="Leverage"
            value={lev}
            min={1}
            max={market.maxLeverage}
            onChange={setLeverage}
            format={(v) => `${v}x`}
            marks={[1, Math.round(market.maxLeverage / 2), market.maxLeverage]}
          />
          <TriggerInputs tp={tpText} sl={slText} onTp={setTpText} onSl={setSlText} />
          {preview !== undefined && (
            <dl className="flex flex-col gap-2 text-footnote" aria-label="Order preview">
              <DetailRow label="Position size">{formatFiat(notionalCents(preview))}</DetailRow>
              <DetailRow label="Entry (mark)">{formatPrice(mark)}</DetailRow>
              <DetailRow label="Liquidation price">
                <span className="font-semibold text-loss" data-testid="liq-price">
                  {formatPrice(liquidationPrice(preview))}
                </span>
              </DetailRow>
            </dl>
          )}
          {preview !== undefined && (
            <PerpWhatIf position={preview} mark={mark} symbol={asset.symbol} />
          )}
          {short && <p className="text-footnote text-loss">Not enough USDG</p>}
          {triggerProblem !== undefined && (
            <p className="text-footnote text-loss">{triggerProblem}</p>
          )}
          <Button
            size="lg"
            block
            variant={side === "long" ? "primary" : "destructive"}
            disabled={!ready}
            loading={sending}
            onClick={() => void open()}
          >
            {`${side === "long" ? "Long" : "Short"} ${asset.symbol} ${lev}x`}
          </Button>
          <p className="text-caption text-ink-3">
            Leverage multiplies losses as well as gains. If the mark reaches the liquidation price,
            the position closes and the margin is lost.
          </p>
        </Card>
        <PerpsPositions positions={positions} now={now} />
      </div>
    </div>
  );
}
