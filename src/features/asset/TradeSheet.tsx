import { useId, useState } from "react";
import { useProviders } from "../../app/providers-context";
import type { Asset } from "../../data/types";
import { multiplierAt } from "../../domain/market/corporate-actions";
import { changeBps } from "../../domain/market/change";
import { marketState } from "../../domain/market/hours";
import { amount, centsToUsdg } from "../../domain/money/amount";
import {
  formatDecimal,
  formatFiat,
  formatPercentBps,
  formatPrice,
  formatToken,
} from "../../domain/money/format";
import { quoteOrder, sharesOf, type OrderUnit, type Side } from "../../domain/trade/order";
import type { TxRequest } from "../../ports/chain";
import { Button } from "../../ui/Button";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Sheet } from "../../ui/Sheet";
import { DetailRow } from "../../ui/DetailRow";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";
import { ValueWhatIf } from "../whatif";
import { realizedOnSale, type Basis } from "../../domain/portfolio/cost-basis";
import { NETWORK_FEE, NETWORK_FEE_COST } from "../transactions/actions";
import { runTransaction } from "../transactions/actions";

const USDG = "rh:USDG";
/** Cents as a USDG amount (6 decimals). */
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/New_York" });

/** Buy or sell against USDG at the live on-chain price, by dollars or by shares. */
export function TradeSheet({
  asset,
  side,
  onClose,
  basis,
}: {
  readonly asset: Asset;
  readonly side: Side;
  readonly onClose: () => void;
  /** What the units held cost, so a sale records the profit or loss it locks in. */
  readonly basis: Basis;
}) {
  const providers = useProviders();
  const account = useActiveAccount();
  const holdings = useHoldings(account);
  const [unit, setUnit] = useState<OrderUnit>("usd");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputId = useId();

  const now = providers.clock.now();
  const price = providers.market.price(asset.id, now);
  const stock = asset.kind === "stock";
  const multiplier = stock ? multiplierAt(asset.actions, now) : undefined;
  const quote = quoteOrder(text, unit, asset.decimals, price, multiplier);
  const held = holdings.find((h) => h.assetId === asset.id)?.quantity ?? amount(0n, asset.decimals);
  const cash = holdings.find((h) => h.assetId === USDG)?.quantity ?? amount(0n, 6);
  const short =
    quote !== undefined &&
    (side === "buy" ? centsToUsdg(quote.cents).base > cash.base : quote.tokens.base > held.base);
  const state = marketState(now);
  const closed = stock && state.session !== "open";
  const close = providers.market.reference(asset.id, now);
  const gap = changeBps(price, close.price);
  const unitName = stock ? "Shares" : asset.symbol;

  async function submit() {
    if (quote === undefined) return;
    const tokensOut = amount(-quote.tokens.base, quote.tokens.decimals);
    const cash = centsToUsdg(quote.cents);
    const request: TxRequest =
      side === "buy"
        ? {
            kind: "trade",
            summary: { verb: "Bought", primary: { assetId: asset.id, quantity: quote.tokens } },
            deltas: [
              { assetId: USDG, quantity: amount(-cash.base, 6) },
              { assetId: asset.id, quantity: quote.tokens },
            ],
            fee: NETWORK_FEE,
          }
        : {
            kind: "trade",
            summary: { verb: "Sold", primary: { assetId: asset.id, quantity: tokensOut } },
            deltas: [
              { assetId: asset.id, quantity: tokensOut },
              { assetId: USDG, quantity: cash },
            ],
            fee: NETWORK_FEE,
            realizedCents: realizedOnSale(basis, quote.tokens, quote.cents),
          };
    setSending(true);
    const tx = await runTransaction(providers, account, request);
    setSending(false);
    if (tx.machine.state === "confirmed") onClose();
  }

  const verb = side === "buy" ? "Buy" : "Sell";
  return (
    <Sheet
      open
      onClose={onClose}
      title={`${verb} ${asset.symbol}`}
      description="Settles in USDG on Robinhood Chain"
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl
          label="Order in"
          options={[
            { value: "usd", label: "Dollars" },
            { value: "units", label: unitName },
          ]}
          value={unit}
          onChange={(next) => {
            setUnit(next);
            setText("");
          }}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-footnote text-ink-3">
            {unit === "usd" ? "Amount in dollars" : `Amount in ${unitName.toLowerCase()}`}
          </label>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            placeholder={unit === "usd" ? "$0" : "0"}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            className="h-12 rounded-md bg-surface-2 px-3 text-title3 font-semibold tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-focus"
          />
          <span className="text-footnote text-ink-3">
            {side === "buy" ? "Buying power " : "You hold "}
            <Private>
              {side === "buy" ? formatToken(cash, "USDG") : formatToken(held, asset.symbol)}
            </Private>
          </span>
        </div>
        {closed && (
          <p
            role="note"
            className="rounded-md bg-warn-soft p-3 text-footnote text-warn"
            data-testid="gap-notice"
          >
            The NYSE is closed{state.reason === "weekend" ? " for the weekend" : ""}. You trade at
            the on-chain price, {formatPercentBps(gap < 0n ? -gap : gap, "negative")}{" "}
            {gap >= 0n ? "above" : "below"} {weekday.format(close.at)}&apos;s close. When the
            listing opens, the price can gap either way.
          </p>
        )}
        <dl className="flex flex-col gap-2 text-footnote">
          <DetailRow label={`Price per ${asset.symbol} token`}>{formatPrice(price)}</DetailRow>
          {multiplier !== undefined && (
            <DetailRow label="Shares per token">{formatDecimal(multiplier)}</DetailRow>
          )}
          {quote !== undefined && (
            <>
              <DetailRow label={side === "buy" ? "You get" : "You sell"}>
                <Private>{formatToken(quote.tokens, asset.symbol)}</Private>
                {multiplier !== undefined && (
                  <span className="text-ink-3">
                    {" "}
                    ({formatDecimal(sharesOf(quote.tokens, multiplier))} shares)
                  </span>
                )}
              </DetailRow>
              <DetailRow label={side === "buy" ? "Cost" : "You receive"}>
                <Private>{formatFiat(quote.cents)}</Private>
              </DetailRow>
            </>
          )}
          <DetailRow label="Network fee">{formatToken(NETWORK_FEE_COST, "ETH")}</DetailRow>
        </dl>
        {multiplier !== undefined && (
          <p className="text-caption text-ink-3">
            A Stock Token tracks shares of {asset.symbol}. Dividends are reinvested by raising the
            shares each token holds, so one token is worth {formatDecimal(multiplier)} shares.
          </p>
        )}
        {quote !== undefined && <ValueWhatIf subject={asset.symbol} valueCents={quote.cents} />}
        {short && (
          <p className="text-footnote text-loss" data-testid="trade-problem">
            {side === "buy" ? "Not enough USDG" : `You don't hold that much ${asset.symbol}`}
          </p>
        )}
        <Button
          size="lg"
          block
          disabled={quote === undefined || short || sending}
          loading={sending}
          onClick={() => void submit()}
        >
          Review {side}
        </Button>
      </div>
    </Sheet>
  );
}
