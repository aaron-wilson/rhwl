import type { ChainId } from "./types";

export type DappKind = "dex" | "lending" | "launchpad";

/** What a site may do once connected. Shown on the connect sheet in this order. */
export type DappPermission = "view" | "transact" | "sign";

export interface Dapp {
  readonly id: string;
  readonly name: string;
  /** The site's address as the browser shows it. */
  readonly origin: string;
  readonly kind: DappKind;
  /** The network the site runs on; connecting switches the site to it. */
  readonly chain: ChainId;
  readonly tagline: string;
  readonly permissions: readonly DappPermission[];
  /** Listed on the browser's start page. The phishing clone is only reachable by its address. */
  readonly listed: boolean;
}

/** Fictional sites the in-wallet browser hosts. No real dApp brand is used. */
export const dapps: readonly Dapp[] = [
  {
    id: "hood-swap",
    name: "Hood Swap",
    origin: "hoodswap.app",
    kind: "dex",
    chain: "robinhood",
    tagline: "Swap Stock Tokens and crypto on Robinhood Chain",
    permissions: ["view", "transact", "sign"],
    listed: true,
  },
  {
    id: "lendwell",
    name: "Lendwell",
    origin: "lendwell.fi",
    kind: "lending",
    chain: "arbitrum",
    tagline: "Supply and borrow ETH and USDG on Arbitrum",
    permissions: ["view", "transact"],
    listed: true,
  },
  {
    id: "curvefront",
    name: "Curvefront",
    origin: "curvefront.xyz",
    kind: "launchpad",
    chain: "base",
    tagline: "Launch and back tokens on a bonding curve on Base",
    permissions: ["view", "transact", "sign"],
    listed: true,
  },
  {
    id: "hood-swap-clone",
    name: "Hood Swap",
    origin: "hoodswap-app.com",
    kind: "dex",
    chain: "robinhood",
    tagline: "Swap Stock Tokens and crypto on Robinhood Chain",
    permissions: ["view", "transact", "sign"],
    listed: false,
  },
];

/** The origins of the listed sites: what a lookalike is measured against. */
export const knownOrigins: readonly string[] = dapps.filter((d) => d.listed).map((d) => d.origin);

export const permissionText: Record<DappPermission, string> = {
  view: "See your address and balances",
  transact: "Ask you to approve transactions",
  sign: "Ask you to sign messages",
};

/** The site an address-bar entry names: its exact origin, with or without a scheme or path. */
export function dappByAddress(input: string): Dapp | undefined {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
  return dapps.find((d) => d.origin === host);
}
