import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccountEntry } from "../accounts";
import { BridgeForm, BridgeRefuel } from "./BridgeForm";
import { BridgeRoutes } from "./BridgeRoutes";
import { BridgeTimeline } from "./BridgeTimeline";
import { chainName, startBridge, useBridges } from "./bridge-store";
import { useBridgeQuote } from "./useBridgeQuote";

/** Move funds between Robinhood Chain and other networks, with routes, refuel and a two-leg timeline. */
export function BridgePage() {
  const account = useActiveAccountEntry();
  const providers = useProviders();
  const jobs = useBridges(account?.id ?? "");
  const now = useNow(1_000);
  const { form, quote } = useBridgeQuote(account);
  const [sending, setSending] = useState(false);

  if (account === undefined || quote === undefined) return null;
  const { fromChain, toChain, fromAsset, toAsset, amountIn, route, short } = quote;
  const ready =
    route !== undefined && amountIn !== undefined && route.out.base > 0n && !short && !sending;

  async function bridge() {
    if (route === undefined || amountIn === undefined || account === undefined) return;
    setSending(true);
    const sent = await startBridge(providers, {
      account: account.id,
      fromChain,
      toChain,
      fromAsset: fromAsset.id,
      toAsset: toAsset.id,
      amountIn,
      route,
    });
    setSending(false);
    if (sent) form.setAmountText("");
  }

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Home
      </Link>
      <PageHeader title="Bridge" subtitle="Move funds to and from Robinhood Chain" />
      <BridgeForm form={form} quote={quote} />
      <BridgeRoutes
        routes={quote.routes}
        route={route}
        toAsset={toAsset}
        onSelect={form.setRouteId}
      />
      <BridgeRefuel form={form} quote={quote} />
      <Button size="lg" block disabled={!ready} loading={sending} onClick={() => void bridge()}>
        {route === undefined ? "Bridge" : `Bridge to ${chainName(toChain)}`}
      </Button>
      <BridgeTimeline jobs={jobs} now={now} />
    </div>
  );
}
