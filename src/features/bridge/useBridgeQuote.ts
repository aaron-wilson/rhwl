import { useState } from "react";
import { useProviders } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import type { Asset, Chain } from "../../data/types";
import { bridgeRoutes, type BridgeRoute } from "../../domain/bridge/routes";
import { amount, parseAmount, type Amount } from "../../domain/money/amount";
import type { AccountEntry } from "../accounts";
import { useHoldings } from "../transactions";

export type Network = Chain["id"];
export type Direction = "in" | "out";
export type RouteId = BridgeRoute["id"];

const others: readonly Network[] = ["solana", "ethereum", "arbitrum", "base"];

/** The native asset a network sends. */
const native: Record<Network, string> = {
  robinhood: "rh:ETH",
  solana: "sol:SOL",
  ethereum: "eth:ETH",
  arbitrum: "arb:ETH",
  base: "base:ETH",
};

/** What the person has chosen on the bridge form, with its setters. */
export interface BridgeFormState {
  readonly direction: Direction;
  readonly setDirection: (direction: Direction) => void;
  readonly setOther: (network: Network) => void;
  readonly receiveAs: string;
  readonly setReceiveAs: (assetId: string) => void;
  readonly amountText: string;
  readonly setAmountText: (text: string) => void;
  readonly setRouteId: (id: RouteId) => void;
  readonly refuel: boolean;
  readonly setRefuel: (on: boolean) => void;
}

/** Everything derived from the form: networks, assets, balance and priced routes. */
export interface BridgeQuote {
  readonly available: readonly Network[];
  readonly network: Network;
  readonly fromChain: Network;
  readonly toChain: Network;
  readonly fromAsset: Asset;
  readonly toAsset: Asset;
  readonly balance: Amount;
  readonly amountIn: Amount | undefined;
  readonly routes: readonly BridgeRoute[];
  readonly route: BridgeRoute | undefined;
  readonly short: boolean;
}

/** Bridge form state and the quote it implies; the quote is undefined without an account. */
export function useBridgeQuote(account: AccountEntry | undefined): {
  readonly form: BridgeFormState;
  readonly quote: BridgeQuote | undefined;
} {
  const providers = useProviders();
  const holdings = useHoldings(account?.id ?? "");
  const [direction, setDirection] = useState<Direction>("in");
  const [other, setOther] = useState<Network>("solana");
  const [receiveAs, setReceiveAs] = useState("rh:USDG");
  const [amountText, setAmountText] = useState("");
  const [routeId, setRouteId] = useState<RouteId>("fast");
  const [refuel, setRefuel] = useState(true);
  const form: BridgeFormState = {
    direction,
    setDirection,
    setOther,
    receiveAs,
    setReceiveAs,
    amountText,
    setAmountText,
    setRouteId,
    refuel,
    setRefuel,
  };

  if (account === undefined) return { form, quote: undefined };
  const available = others.filter((n) => n !== "solana" || account.solanaAddress !== undefined);
  const network = available.includes(other) ? other : (available[0] ?? "ethereum");
  const fromChain: Network = direction === "in" ? network : "robinhood";
  const toChain: Network = direction === "in" ? "robinhood" : network;
  const fromAsset = assetById(native[fromChain]);
  const toAsset = assetById(toChain === "robinhood" ? receiveAs : native[toChain]);
  const balance =
    holdings.find((h) => h.assetId === fromAsset.id)?.quantity ?? amount(0n, fromAsset.decimals);
  const parsed = parseAmount(amountText.trim(), fromAsset.decimals);
  const amountIn = parsed !== undefined && parsed.base > 0n ? parsed : undefined;
  const refuelOn = refuel && toChain === "robinhood" && toAsset.id !== "rh:ETH";
  const at = providers.clock.now();
  const routes =
    amountIn === undefined
      ? []
      : bridgeRoutes(
          { chain: fromChain, asset: fromAsset, price: providers.market.price(fromAsset.id, at) },
          { chain: toChain, asset: toAsset, price: providers.market.price(toAsset.id, at) },
          amountIn,
          { refuel: refuelOn, ethPrice: providers.market.price("rh:ETH", at) },
        );
  const route = routes.find((r) => r.id === routeId) ?? routes[0];
  const short = amountIn !== undefined && amountIn.base > balance.base;
  return {
    form,
    quote: {
      available,
      network,
      fromChain,
      toChain,
      fromAsset,
      toAsset,
      balance,
      amountIn,
      routes,
      route,
      short,
    },
  };
}
