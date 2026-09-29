import { assetById } from "../../data/assets";
import { REBALANCE_AT_BPS, type Weight } from "../../domain/basket/basket";
import { formatPercentBps } from "../../domain/money/format";
import { basketAtShock } from "../../domain/whatif";
import { WhatIfSlider } from "./WhatIfSlider";

/** A basket right after buying, when only its Stock Tokens move: how far it drifts from target. */
export function BasketWhatIf({
  weights,
  legCents,
}: {
  readonly weights: readonly Weight[];
  readonly legCents: readonly bigint[];
}) {
  const stocks = weights.map((w) => assetById(w.assetId).kind === "stock");
  if (!stocks.includes(true)) return null;
  return (
    <WhatIfSlider
      subject="the Stock Tokens"
      outcome={(bps) => {
        const out = basketAtShock(legCents, weights, stocks, bps);
        const due = out.driftBps >= REBALANCE_AT_BPS;
        return (
          <span>
            Drifts up to {formatPercentBps(BigInt(out.driftBps), "negative")} from target
            {due ? ", enough to suggest a rebalance." : "."}
          </span>
        );
      }}
    />
  );
}
