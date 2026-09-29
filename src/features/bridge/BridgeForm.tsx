import { useId } from "react";
import { assetById } from "../../data/assets";
import { formatToken } from "../../domain/money/format";
import { Card } from "../../ui/Card";
import { cx } from "../../ui/cx";
import { Switch } from "../../ui/Switch";
import { Private } from "../privacy";
import { chainName } from "./bridge-store";
import type { BridgeFormState, BridgeQuote, Direction } from "./useBridgeQuote";

const directions: readonly Direction[] = ["in", "out"];
const receiveOptions: readonly string[] = ["rh:USDG", "rh:ETH"];

const chip = (active: boolean) =>
  cx(
    "h-10 rounded-full px-4 text-footnote font-semibold transition-colors duration-fast",
    active ? "bg-ink text-canvas" : "bg-surface-2 text-ink-2 hover:text-ink",
  );

export interface BridgeFormProps {
  readonly form: BridgeFormState;
  readonly quote: BridgeQuote;
}

/** Direction, network, amount and receive-as choices. */
export function BridgeForm({ form, quote }: BridgeFormProps) {
  const amountId = useId();
  const { direction, receiveAs, amountText } = form;
  const { available, network, fromChain, toChain, fromAsset, balance, short } = quote;
  return (
    <>
      <div role="group" aria-label="Direction" className="flex gap-2">
        {directions.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={direction === d}
            onClick={() => {
              form.setDirection(d);
              form.setAmountText("");
            }}
            className={chip(direction === d)}
          >
            {d === "in" ? "Bridge in" : "Bridge out"}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label={direction === "in" ? "From network" : "To network"}
        className="flex flex-wrap gap-2"
      >
        {available.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={n === network}
            onClick={() => {
              form.setOther(n);
              form.setAmountText("");
            }}
            className={chip(n === network)}
          >
            {chainName(n)}
          </button>
        ))}
      </div>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-footnote text-ink-3">
          <label htmlFor={amountId}>
            Send {fromAsset.symbol} on {chainName(fromChain)}
          </label>
          <span>
            Balance <Private>{formatToken(balance, fromAsset.symbol)}</Private>
          </span>
        </div>
        <input
          id={amountId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amountText}
          onChange={(event) => {
            form.setAmountText(event.target.value);
          }}
          className="h-12 bg-transparent text-title2 font-bold tabular-nums outline-none"
        />
        {balance.base === 0n && (
          <p className="text-footnote text-ink-3">
            Nothing to send on {chainName(fromChain)} in this account.
          </p>
        )}
        {short && <p className="text-footnote text-loss">Not enough {fromAsset.symbol}</p>}
      </Card>
      {toChain === "robinhood" && (
        <div role="group" aria-label="Receive as" className="flex gap-2">
          {receiveOptions.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={receiveAs === id}
              onClick={() => {
                form.setReceiveAs(id);
              }}
              className={chip(receiveAs === id)}
            >
              Receive {assetById(id).symbol}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** The refuel switch, shown only when arriving on Robinhood Chain in something other than ETH. */
export function BridgeRefuel({ form, quote }: BridgeFormProps) {
  if (quote.toChain !== "robinhood" || quote.toAsset.id === "rh:ETH") return null;
  return (
    <Card>
      <Switch
        label="Refuel"
        description="Spend $3 of the transfer on ETH, so you can pay fees on arrival"
        checked={form.refuel}
        onChange={form.setRefuel}
      />
    </Card>
  );
}
