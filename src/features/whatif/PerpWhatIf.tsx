import type { Amount } from "../../domain/money/amount";
import { formatFiat, formatPercentBps, formatPrice } from "../../domain/money/format";
import type { Position } from "../../domain/perps/position";
import { perpAtShock } from "../../domain/whatif";
import { Private } from "../privacy";
import { WhatIfSlider } from "./WhatIfSlider";

/** A perp order under a price shock: P&L, or liquidation, and the buffer left. */
export function PerpWhatIf({
  position,
  mark,
  symbol,
}: {
  readonly position: Position;
  readonly mark: Amount;
  readonly symbol: string;
}) {
  return (
    <WhatIfSlider
      subject={symbol}
      outcome={(bps) => {
        const out = perpAtShock(position, mark, bps);
        return out.liquidated ? (
          <span className="font-semibold text-loss">
            Liquidated at {formatPrice(out.mark)}: the margin is lost.
          </span>
        ) : (
          <span>
            At {formatPrice(out.mark)}, P&amp;L{" "}
            <span className={out.pnlCents >= 0n ? "text-gain" : "text-loss"}>
              <Private>{formatFiat(out.pnlCents, "always")}</Private>
            </span>
            , {formatPercentBps(out.bufferBps, "negative")} from liquidation.
          </span>
        );
      }}
    />
  );
}
