import { useState } from "react";
import { useProviders } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { formatFiat, formatPercentBps, formatPrice } from "../../domain/money/format";
import {
  fundingCents,
  liquidationPrice,
  notionalCents,
  pnlCents,
} from "../../domain/perps/position";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { DetailRow } from "../../ui/DetailRow";
import { Private } from "../privacy";
import { closePosition, type OpenPosition } from "./perps-store";

/** One open position: live P&L, its numbers, and partial or full close. */
export function PerpPositionCard({
  position,
  now,
}: {
  readonly position: OpenPosition;
  readonly now: Date;
}) {
  const providers = useProviders();
  const [closing, setClosing] = useState(false);
  const asset = assetById(position.market.assetId);
  const mark = providers.market.price(asset.id, now);
  const pnl = pnlCents(position, mark);
  const paid = fundingCents(position, position.market.fundingCentiBps, now);
  const net = pnl - paid;
  const up = net >= 0n;
  const close = async (percent: 25 | 50 | 100) => {
    setClosing(true);
    await closePosition(providers, position.id, percent);
    setClosing(false);
  };
  return (
    <Card
      className="flex flex-col gap-3"
      aria-label={`${position.side} ${asset.symbol} ${position.leverage}x`}
      role="region"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-headline font-semibold capitalize">
          {position.side} {asset.symbol} {position.leverage}x
        </span>
        <span
          className={cx("font-semibold tabular-nums", up ? "text-gain" : "text-loss")}
          data-testid="position-pnl"
        >
          <Private>{formatFiat(net, "always")}</Private> (
          {formatPercentBps((net * 10_000n) / position.collateralCents)})
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-footnote">
        <DetailRow label="Size">
          <Private>{formatFiat(notionalCents(position))}</Private>
        </DetailRow>
        <DetailRow label="Margin">
          <Private>{formatFiat(position.collateralCents)}</Private>
        </DetailRow>
        <DetailRow label="Entry">{formatPrice(position.entryPrice)}</DetailRow>
        <DetailRow label="Mark">{formatPrice(mark)}</DetailRow>
        <DetailRow label="Liquidation">{formatPrice(liquidationPrice(position))}</DetailRow>
        <DetailRow label="Funding paid">
          <Private>{formatFiat(paid, "always")}</Private>
        </DetailRow>
        {position.takeProfit !== undefined && (
          <DetailRow label="Take profit">{formatPrice(position.takeProfit)}</DetailRow>
        )}
        {position.stopLoss !== undefined && (
          <DetailRow label="Stop loss">{formatPrice(position.stopLoss)}</DetailRow>
        )}
      </dl>
      <div className="flex gap-2">
        {([25, 50, 100] as const).map((percent) => (
          <Button
            key={percent}
            size="sm"
            variant="secondary"
            disabled={closing}
            onClick={() => void close(percent)}
          >
            {percent === 100 ? "Close" : `Close ${percent}%`}
          </Button>
        ))}
      </div>
    </Card>
  );
}
