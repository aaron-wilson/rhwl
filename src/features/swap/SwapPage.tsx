import { ChevronLeft, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { amount, parseAmount, toPlainDecimal } from "../../domain/money/amount";
import { maxSendable } from "../../domain/send/amount";
import { QUOTE_TTL_MS, quoteLife } from "../../domain/swap/quote";
import {
  defaultSlippageBps,
  HIGH_IMPACT_BPS,
  minimumReceived,
  parseSlippage,
} from "../../domain/swap/routes";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccount } from "../accounts";
import { useHoldings } from "../transactions";
import { runTransaction } from "../transactions/actions";
import { feeCost, GAS, swapRequest } from "./swap-request";
import { SwapDetails, type SlippageMode } from "./SwapDetails";
import { FlipButton, PayCard, QuoteStatus, ReceiveCard } from "./SwapParts";
import { SwapRoutes } from "./SwapRoutes";
import { TokenPicker } from "./TokenPicker";
import { useSwapQuote } from "./useSwapQuote";

/** Swap on Robinhood Chain: live routes, slippage, MEV protection, and a quote that expires. */
export function SwapPage() {
  const account = useActiveAccount();
  const providers = useProviders();
  const holdings = useHoldings(account);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [fromId, setFromId] = useState(params.get("from") ?? "rh:USDG");
  const [toId, setToId] = useState(
    params.get("to") ?? (params.get("from") === "rh:ETH" ? "rh:USDG" : "rh:ETH"),
  );
  const [amountText, setAmountText] = useState("");
  const [picking, setPicking] = useState<"from" | "to" | undefined>(undefined);
  const [routeId, setRouteId] = useState<string | undefined>(undefined);
  const [slippageMode, setSlippageMode] = useState<SlippageMode>("auto");
  const [customText, setCustomText] = useState("1");
  const [mev, setMev] = useState(true);
  const [sending, setSending] = useState(false);
  const now = useNow(1_000);

  const from = assetById(fromId);
  const to = assetById(toId);
  const balance = holdings.find((h) => h.assetId === fromId)?.quantity ?? amount(0n, from.decimals);
  const gasBalance = holdings.find((h) => h.assetId === GAS)?.quantity ?? amount(0n, 18);
  const parsed = parseAmount(amountText.trim(), from.decimals);
  const amountIn = parsed !== undefined && parsed.base > 0n ? parsed : undefined;
  const quote = useSwapQuote(fromId, toId, amountIn);

  const routes = quote.status === "fresh" || quote.status === "stale" ? quote.routes : [];
  const route = routes.find((r) => r.venue.id === routeId) ?? routes[0];
  const slippage =
    slippageMode === "auto" ? defaultSlippageBps(from, to) : parseSlippage(customText);
  const minimum =
    route === undefined || slippage === undefined
      ? undefined
      : minimumReceived(route.out, slippage);
  const short =
    amountIn !== undefined &&
    (amountIn.base > balance.base ||
      (fromId === GAS
        ? amountIn.base + feeCost.base > gasBalance.base
        : feeCost.base > gasBalance.base));
  const highImpact = route !== undefined && route.impactBps > HIGH_IMPACT_BPS;
  const ready =
    quote.status === "fresh" &&
    route !== undefined &&
    route.out.base > 0n &&
    minimum !== undefined &&
    !short &&
    !sending;

  function flip() {
    setFromId(toId);
    setToId(fromId);
    setAmountText("");
    setRouteId(undefined);
  }

  async function swap() {
    if (route === undefined || amountIn === undefined) return;
    const request = swapRequest(fromId, toId, to.symbol, amountIn, route.out);
    setSending(true);
    const tx = await runTransaction(providers, account, request);
    setSending(false);
    if (tx.machine.state === "confirmed") void navigate("/activity");
  }

  const life = quote.status === "fresh" ? quoteLife(quote.quotedAt, now) : 0;
  const secondsLeft = Math.ceil((life * QUOTE_TTL_MS) / 1_000);

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Home
      </Link>
      <PageHeader title="Swap" subtitle="On Robinhood Chain" />
      <PayCard
        amountText={amountText}
        onAmountText={(text) => {
          setAmountText(text);
          setRouteId(undefined);
        }}
        balance={balance}
        symbol={from.symbol}
        onPick={() => {
          setPicking("from");
        }}
        onMax={() => {
          setAmountText(toPlainDecimal(maxSendable(balance, fromId === GAS ? feeCost : undefined)));
        }}
      />
      <FlipButton onClick={flip} />
      <ReceiveCard
        outText={
          route === undefined ? (quote.status === "quoting" ? "…" : "0") : toPlainDecimal(route.out)
        }
        symbol={to.symbol}
        onPick={() => {
          setPicking("to");
        }}
      />
      {amountIn !== undefined && (
        <QuoteStatus life={life} fresh={quote.status === "fresh"} secondsLeft={secondsLeft} />
      )}
      {routes.length > 0 && (
        <SwapRoutes
          routes={routes}
          selectedId={route?.venue.id}
          toSymbol={to.symbol}
          onSelect={setRouteId}
        />
      )}
      {route !== undefined && (
        <SwapDetails
          route={route}
          highImpact={highImpact}
          toSymbol={to.symbol}
          slippage={slippage}
          slippageMode={slippageMode}
          onSlippageMode={setSlippageMode}
          customText={customText}
          onCustomText={setCustomText}
          minimum={minimum}
          mev={mev}
          onMev={setMev}
        />
      )}
      {highImpact && (
        <p role="alert" className="flex gap-2 rounded-md bg-loss-soft p-4 text-footnote text-loss">
          <TriangleAlert {...icon()} className="shrink-0" />
          This trade moves the price by more than 5%. You get noticeably less than the market rate.
        </p>
      )}
      {short && (
        <p className="px-1 text-footnote text-loss" data-testid="swap-problem">
          {fromId === GAS || feeCost.base <= gasBalance.base
            ? `Not enough ${from.symbol}`
            : "Not enough ETH for the network fee"}
        </p>
      )}
      <Button size="lg" block disabled={!ready} loading={sending} onClick={() => void swap()}>
        {highImpact ? "Swap anyway" : "Review swap"}
      </Button>
      {picking !== undefined && (
        <TokenPicker
          title={picking === "from" ? "Pay with" : "Receive"}
          exclude={picking === "from" ? toId : fromId}
          holdings={holdings}
          onClose={() => {
            setPicking(undefined);
          }}
          onPick={(id) => {
            if (picking === "from") setFromId(id);
            else setToId(id);
            setRouteId(undefined);
            setPicking(undefined);
          }}
        />
      )}
    </div>
  );
}
