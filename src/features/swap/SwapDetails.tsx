import { useId } from "react";
import { formatPercentBps, formatToken } from "../../domain/money/format";
import type { Amount } from "../../domain/money/amount";
import type { Route } from "../../domain/swap/routes";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { DetailRow } from "../../ui/DetailRow";
import { Switch } from "../../ui/Switch";
import { feeCost } from "./swap-request";

export type SlippageMode = "auto" | "custom";

/** Price impact, slippage tolerance, minimum received, fee and MEV protection. */
export function SwapDetails({
  route,
  highImpact,
  toSymbol,
  slippage,
  slippageMode,
  onSlippageMode,
  customText,
  onCustomText,
  minimum,
  mev,
  onMev,
}: {
  readonly route: Route;
  readonly highImpact: boolean;
  readonly toSymbol: string;
  readonly slippage: number | undefined;
  readonly slippageMode: SlippageMode;
  readonly onSlippageMode: (mode: SlippageMode) => void;
  readonly customText: string;
  readonly onCustomText: (text: string) => void;
  readonly minimum: Amount | undefined;
  readonly mev: boolean;
  readonly onMev: (on: boolean) => void;
}) {
  const customId = useId();
  return (
    <Card className="flex flex-col gap-3 text-footnote">
      <dl className="flex flex-col gap-3">
        <DetailRow label="Price impact">
          <span className={highImpact ? "font-semibold text-loss" : undefined}>
            {formatPercentBps(route.impactBps, "negative")}
          </span>
        </DetailRow>
        <div className="flex flex-col gap-2">
          <DetailRow label="Slippage tolerance">
            {slippage === undefined ? "—" : formatPercentBps(BigInt(slippage), "negative")}
          </DetailRow>
          <div className="flex flex-wrap items-center gap-2">
            {(["auto", "custom"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={slippageMode === mode}
                onClick={() => {
                  onSlippageMode(mode);
                }}
                className={cx(
                  "h-8 rounded-full px-3 font-semibold",
                  slippageMode === mode ? "bg-ink text-canvas" : "bg-surface-2 text-ink-2",
                )}
              >
                {mode === "auto" ? "Auto" : "Custom"}
              </button>
            ))}
            {slippageMode === "custom" && (
              <>
                <label htmlFor={customId} className="sr-only">
                  Custom slippage percent
                </label>
                <input
                  id={customId}
                  inputMode="decimal"
                  value={customText}
                  onChange={(event) => {
                    onCustomText(event.target.value);
                  }}
                  className="h-8 w-16 rounded-md bg-surface-2 px-2 tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-focus"
                />
                <span className="text-ink-3">%</span>
              </>
            )}
          </div>
          {slippage === undefined && (
            <p className="text-loss">Enter a tolerance above 0% and at most 50%.</p>
          )}
        </div>
        <DetailRow label="Minimum received">
          {minimum === undefined ? "—" : formatToken(minimum, toSymbol)}
        </DetailRow>
        <DetailRow label="Network fee">{formatToken(feeCost, "ETH")}</DetailRow>
      </dl>
      <Switch
        label="MEV protection"
        description={
          mev
            ? "Sent privately, so bots can't sandwich the trade"
            : "Sent to the public mempool, where bots can front-run it"
        }
        checked={mev}
        onChange={onMev}
      />
    </Card>
  );
}
