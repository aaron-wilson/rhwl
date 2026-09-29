import type { Asset } from "../../data/types";
import { formatFiat, formatPercentBps, formatPrice, formatToken } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Private } from "../privacy";
import type { PositionView } from "./usePosition";

/** Quantity, value, cost and unrealized P&L, or an empty state when nothing is held. */
export function PositionCard({
  asset,
  position,
  onFlex,
}: {
  readonly asset: Asset;
  readonly position: PositionView;
  /** Opens the signed gain/loss card for this position. */
  readonly onFlex?: () => void;
}) {
  const up = position.pnl.cents >= 0n;
  return (
    <section aria-labelledby="asset-position" className="flex flex-col gap-2">
      <h2 id="asset-position" className="px-1 text-footnote font-semibold text-ink-3">
        Your position
      </h2>
      <Card>
        {position.quantity.base === 0n ? (
          <p className="text-body text-ink-2">
            You don&apos;t hold any {asset.symbol} in this account.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Figure label="Quantity">
              <Private>{formatToken(position.quantity, asset.symbol)}</Private>
            </Figure>
            <Figure label="Value">
              <Private>{formatFiat(position.valueCents)}</Private>
            </Figure>
            <Figure label="Average cost">
              {position.averagePrice === undefined ? "—" : formatPrice(position.averagePrice)}
            </Figure>
            <Figure label="Cost basis">
              <Private>{formatFiat(position.basis.costCents)}</Private>
            </Figure>
            <Figure label="Unrealized P&L" wide>
              <span className={up ? "text-gain" : "text-loss"}>
                <Private>{formatFiat(position.pnl.cents, "always")}</Private> (
                {formatPercentBps(position.pnl.bps)})
              </span>
            </Figure>
          </dl>
        )}
        {position.quantity.base !== 0n && onFlex !== undefined && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={onFlex}>
            Flex this position
          </Button>
        )}
      </Card>
    </section>
  );
}

function Figure({
  label,
  wide = false,
  children,
}: {
  readonly label: string;
  readonly wide?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className={wide ? "col-span-2 flex flex-col gap-1" : "flex flex-col gap-1"}>
      <dt className="text-footnote text-ink-3">{label}</dt>
      <dd className="text-body font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
