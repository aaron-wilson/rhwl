import { useId } from "react";
import { toPlainDecimal, type Amount } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Private } from "../privacy";
import { railAssets, type RailAsset } from "./rail-store";

export type TransferDirection = "deposit" | "withdraw";

export interface RailDirectionProps {
  readonly direction: TransferDirection;
  readonly onDirectionChange: (next: TransferDirection) => void;
  readonly asset: RailAsset;
  readonly onAssetChange: (next: RailAsset) => void;
  readonly symbol: string;
  readonly available: Amount;
  readonly amountText: string;
  readonly onAmountTextChange: (next: string) => void;
  readonly short: boolean;
}

/** Which way the transfer goes, which asset, and how much. */
export function RailDirection({
  direction,
  onDirectionChange,
  asset,
  onAssetChange,
  symbol,
  available,
  amountText,
  onAmountTextChange,
  short,
}: RailDirectionProps) {
  const amountId = useId();
  return (
    <>
      <SegmentedControl
        label="Direction"
        options={[
          { value: "deposit", label: "To wallet" },
          { value: "withdraw", label: "To Robinhood" },
        ]}
        value={direction}
        onChange={onDirectionChange}
      />
      <div role="group" aria-label="Asset" className="flex gap-2">
        {railAssets.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={asset === id}
            onClick={() => {
              onAssetChange(id);
            }}
            className={cx(
              "h-10 rounded-full px-4 text-footnote font-semibold",
              asset === id ? "bg-ink text-canvas" : "bg-surface-2 text-ink-2",
            )}
          >
            {id === "rh:USDG" ? "Cash as USDG" : "ETH"}
          </button>
        ))}
      </div>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-footnote text-ink-3">
          <label htmlFor={amountId}>Amount in {symbol}</label>
          <span>
            Available <Private>{formatToken(available, symbol)}</Private>
          </span>
        </div>
        <input
          id={amountId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amountText}
          onChange={(event) => {
            onAmountTextChange(event.target.value);
          }}
          className="h-12 bg-transparent text-title2 font-bold tabular-nums outline-none"
        />
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => {
            onAmountTextChange(toPlainDecimal(available));
          }}
        >
          Max
        </Button>
        {short && <p className="text-footnote text-loss">More than is available</p>}
      </Card>
    </>
  );
}
