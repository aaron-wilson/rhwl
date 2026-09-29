import { useId, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import type { MemeToken } from "../../data/types";
import { progressBps } from "../../domain/launch/curve";
import { amount, parseAmount } from "../../domain/money/amount";
import { formatPercentBps, formatToken } from "../../domain/money/format";
import type { Side } from "../../domain/trade/order";
import { Button } from "../../ui/Button";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Sheet } from "../../ui/Sheet";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { ValueWhatIf } from "../whatif";
import { useHoldings } from "../transactions";
import {
  buyOnLaunch,
  previewBuy,
  previewSell,
  quoteFromUsd,
  sellOnLaunch,
  useLaunch,
} from "./launch-store";

/** Buy from or sell to a launch's bonding curve, paying in its quote asset. */
export function LaunchSheet({
  meme,
  initialSide,
  onClose,
}: {
  readonly meme: MemeToken;
  readonly initialSide: Side;
  readonly onClose: () => void;
}) {
  const providers = useProviders();
  const account = useActiveAccount();
  const holdings = useHoldings(account);
  const launch = useLaunch(meme.id);
  const [side, setSide] = useState<Side>(initialSide);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputId = useId();

  const quote = assetById(meme.quotes[0] ?? "rh:ETH");
  const unit = side === "buy" ? quote : meme;
  const held = (id: string, decimals: number) =>
    holdings.find((h) => h.assetId === id)?.quantity ?? amount(0n, decimals);
  const available = held(unit.id, unit.decimals);
  const parsed = parseAmount(text.trim(), unit.decimals);
  const value = parsed !== undefined && parsed.base > 0n ? parsed : undefined;
  const trade =
    value === undefined
      ? undefined
      : side === "buy"
        ? previewBuy(providers, meme, value)
        : previewSell(meme, value);
  const short = value !== undefined && value.base > available.base;
  const before = launch?.progressBps ?? 0;
  const after = trade === undefined ? before : progressBps(trade.curve);

  async function submit() {
    if (value === undefined) return;
    setSending(true);
    const ok =
      side === "buy"
        ? await buyOnLaunch(providers, account, meme, value)
        : await sellOnLaunch(providers, account, meme, value);
    setSending(false);
    if (ok) onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${meme.name} on the curve`}
      description={`Priced by its bonding curve, paid in ${quote.symbol}`}
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl
          label="Side"
          options={[
            { value: "buy", label: "Buy" },
            { value: "sell", label: "Sell" },
          ]}
          value={side}
          onChange={(next) => {
            setSide(next);
            setText("");
          }}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-footnote text-ink-3">
            Amount in {unit.symbol}
          </label>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            className="h-12 rounded-md bg-surface-2 px-3 text-title3 font-semibold tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-focus"
          />
          <span className="text-footnote text-ink-3">
            Available <Private>{formatToken(available, unit.symbol)}</Private>
          </span>
        </div>
        {trade !== undefined && (
          <dl className="flex flex-col gap-2 text-footnote">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{side === "buy" ? "You get" : "You receive"}</dt>
              <dd className="tabular-nums" data-testid="curve-out">
                {side === "buy"
                  ? formatToken(trade.tokens, meme.symbol)
                  : formatToken(quoteFromUsd(providers, quote.id, trade.usd), quote.symbol)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">Curve progress</dt>
              <dd className="tabular-nums" data-testid="curve-progress">
                {formatPercentBps(BigInt(before), "negative")} →{" "}
                {formatPercentBps(BigInt(after), "negative")}
              </dd>
            </div>
            {trade.graduated && (
              <p
                className="rounded-md bg-accent-soft p-3 font-semibold text-accent"
                data-testid="graduates"
              >
                This buy fills the curve: {meme.name} graduates to an open pool.
                {trade.refund.base > 0n && " The part the curve can't take stays in your wallet."}
              </p>
            )}
          </dl>
        )}
        {trade !== undefined && side === "buy" && (
          <ValueWhatIf
            subject={meme.quotes.map((id) => assetById(id).symbol).join("/")}
            valueCents={trade.usd.base / 1_000_000n}
            assumption={`if ${meme.symbol} holds its pair`}
          />
        )}
        {short && <p className="text-footnote text-loss">More than is available</p>}
        <Button
          size="lg"
          block
          disabled={trade === undefined || trade.tokens.base === 0n || short || sending}
          loading={sending}
          onClick={() => void submit()}
        >
          {side === "buy" ? "Buy on the curve" : "Sell to the curve"}
        </Button>
        <p className="text-caption text-ink-3">
          The launchpad keeps 1% of each curve trade. Launch tokens are fictional and can go to
          zero.
        </p>
      </div>
    </Sheet>
  );
}
