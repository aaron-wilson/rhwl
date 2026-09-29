import { ArrowDownUp, ChevronDown } from "lucide-react";
import { useId } from "react";
import type { Amount } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { TokenIcon } from "../../ui/TokenIcon";
import { Private } from "../privacy";

/** The token chip beside an amount; opens the picker. */
function TokenButton({
  symbol,
  label,
  onClick,
}: {
  readonly symbol: string;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-surface-2 pr-3 pl-1 font-semibold"
    >
      <TokenIcon symbol={symbol} size="sm" />
      {symbol}
      <ChevronDown {...icon()} />
    </button>
  );
}

/** Drains as the quote ages; empty while a new quote is on its way. */
function QuoteRing({ life }: { readonly life: number }) {
  const circumference = 2 * Math.PI * 8;
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 -rotate-90">
      <circle
        cx={10}
        cy={10}
        r={8}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={2.5}
      />
      <circle
        cx={10}
        cy={10}
        r={8}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - life)}
        className="text-accent"
      />
    </svg>
  );
}

/** The amount being paid, the balance it comes from, and Max. */
export function PayCard({
  amountText,
  onAmountText,
  balance,
  symbol,
  onPick,
  onMax,
}: {
  readonly amountText: string;
  readonly onAmountText: (text: string) => void;
  readonly balance: Amount;
  readonly symbol: string;
  readonly onPick: () => void;
  readonly onMax: () => void;
}) {
  const id = useId();
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-footnote text-ink-3">
        <label htmlFor={id}>You pay</label>
        <span>
          Balance <Private>{formatToken(balance, symbol)}</Private>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amountText}
          onChange={(event) => {
            onAmountText(event.target.value);
          }}
          className="h-12 min-w-0 flex-1 bg-transparent text-title2 font-bold tabular-nums outline-none"
        />
        <TokenButton symbol={symbol} label={`Pay with ${symbol}. Change token`} onClick={onPick} />
      </div>
      <Button size="sm" variant="secondary" className="self-start" onClick={onMax}>
        Max
      </Button>
    </Card>
  );
}

/** The ring and countdown for the live quote, announced politely. */
export function QuoteStatus({
  life,
  fresh,
  secondsLeft,
}: {
  readonly life: number;
  readonly fresh: boolean;
  readonly secondsLeft: number;
}) {
  return (
    <div
      className="flex items-center gap-2 px-1 text-footnote text-ink-2"
      aria-live="polite"
      data-testid="quote-status"
    >
      <QuoteRing life={life} />
      {fresh ? `Quote refreshes in ${secondsLeft}s` : "Refreshing quote…"}
    </div>
  );
}

/** Swaps the pay and receive tokens. */
export function FlipButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Swap direction"
      onClick={onClick}
      className="-my-6 flex size-10 items-center justify-center self-center rounded-full border border-line bg-surface shadow-sm"
    >
      <ArrowDownUp {...icon()} />
    </button>
  );
}

/** What the selected route pays out. */
export function ReceiveCard({
  outText,
  symbol,
  onPick,
}: {
  readonly outText: string;
  readonly symbol: string;
  readonly onPick: () => void;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-footnote text-ink-3">You receive</span>
      <div className="flex items-center gap-2">
        <span
          className="min-w-0 flex-1 truncate text-title2 font-bold tabular-nums"
          data-testid="swap-out"
        >
          {outText}
        </span>
        <TokenButton symbol={symbol} label={`Receive ${symbol}. Change token`} onClick={onPick} />
      </div>
    </Card>
  );
}
