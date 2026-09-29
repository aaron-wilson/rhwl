import { useId } from "react";
import { assetById } from "../../data/assets";
import type { Amount } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import type { AmountUnit, SendProblem } from "../../domain/send/amount";
import type { Holding } from "../../ports/chain";
import { Button } from "../../ui/Button";
import { Private } from "../privacy";
import { feeCost, GAS, inputClass } from "./send-form";

/** Asset, amount in tokens or dollars, Max, and what is wrong with the amount. */
export function AmountStep({
  sendable,
  assetId,
  onAsset,
  amountText,
  setAmountText,
  unit,
  onToggleUnit,
  onMax,
  balance,
  converted,
  value,
  problem,
}: {
  readonly sendable: readonly Holding[];
  readonly assetId: string;
  readonly onAsset: (id: string) => void;
  readonly amountText: string;
  readonly setAmountText: (text: string) => void;
  readonly unit: AmountUnit;
  readonly onToggleUnit: () => void;
  readonly onMax: () => void;
  readonly balance: Amount;
  readonly converted: string | undefined;
  readonly value: Amount | undefined;
  readonly problem: SendProblem | undefined;
}) {
  const ids = { asset: useId(), amount: useId() };
  const asset = assetById(assetId);
  return (
    <section aria-labelledby="send-amount" className="flex flex-col gap-2">
      <h2 id="send-amount" className="px-1 text-footnote font-semibold text-ink-3">
        Amount
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 flex flex-col gap-1">
          <label htmlFor={ids.amount} className="sr-only">
            Amount in {unit === "token" ? asset.symbol : "US dollars"}
          </label>
          <div className="flex gap-2">
            <input
              id={ids.amount}
              inputMode="decimal"
              autoComplete="off"
              placeholder={unit === "token" ? "0" : "$0"}
              value={amountText}
              onChange={(event) => {
                setAmountText(event.target.value);
              }}
              className={`${inputClass} tabular-nums`}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.asset} className="sr-only">
            Asset
          </label>
          <select
            id={ids.asset}
            value={assetId}
            onChange={(event) => {
              onAsset(event.target.value);
            }}
            className={inputClass}
          >
            {sendable.map((h) => (
              <option key={h.assetId} value={h.assetId}>
                {assetById(h.assetId).symbol}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-footnote">
        <span className="text-ink-3">
          Balance <Private>{formatToken(balance, asset.symbol)}</Private>
          {converted !== undefined && <span className="text-ink-2"> · ≈ {converted}</span>}
        </span>
        <span className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            aria-pressed={unit === "usd"}
            onClick={onToggleUnit}
          >
            {unit === "token" ? "Enter in USD" : `Enter in ${asset.symbol}`}
          </Button>
          <Button size="sm" variant="secondary" onClick={onMax}>
            Max
          </Button>
        </span>
      </div>
      {amountText.trim() !== "" && value === undefined && (
        <p className="px-1 text-footnote text-loss">
          Enter an amount above zero
          {unit === "token" ? `, with at most ${asset.decimals} decimal places` : ""}.
        </p>
      )}
      {problem !== undefined && (
        <p className="px-1 text-footnote text-loss" data-testid="send-problem">
          {problem === "insufficient"
            ? assetId === GAS
              ? "Not enough ETH for this and the network fee"
              : `Not enough ${asset.symbol}`
            : "Not enough ETH for the network fee"}
        </p>
      )}
      <p className="px-1 text-caption text-ink-3">
        Network fee {formatToken(feeCost, "ETH")}, paid in ETH.
      </p>
    </section>
  );
}
