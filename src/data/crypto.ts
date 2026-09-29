import type { CryptoAsset } from "./types";

export const cryptoAssets: readonly CryptoAsset[] = [
  {
    id: "rh:ETH",
    symbol: "ETH",
    name: "Ether",
    chain: "robinhood",
    decimals: 18,
    kind: "crypto",
    splash: "sky",
    anchorUsd: "3239.88",
  },
  {
    id: "rh:WBTC",
    symbol: "BTC",
    name: "Bitcoin",
    chain: "robinhood",
    decimals: 8,
    kind: "crypto",
    splash: "amber",
    anchorUsd: "112604.00",
  },
  {
    id: "rh:USDG",
    symbol: "USDG",
    name: "Global Dollar",
    chain: "robinhood",
    decimals: 6,
    kind: "stable",
    splash: "teal",
    anchorUsd: "1.00",
  },
  {
    id: "rh:USDC",
    symbol: "USDC",
    name: "USD Coin",
    chain: "robinhood",
    decimals: 6,
    kind: "stable",
    splash: "blue",
    anchorUsd: "1.00",
  },
  {
    id: "sol:SOL",
    symbol: "SOL",
    name: "Solana",
    chain: "solana",
    decimals: 9,
    kind: "crypto",
    splash: "violet",
    anchorUsd: "214.17",
  },
  // Native ETH on the networks the wallet bridges from. Same asset, same price.
  ...(
    [
      ["eth:ETH", "ethereum"],
      ["arb:ETH", "arbitrum"],
      ["base:ETH", "base"],
    ] as const
  ).map(([id, chain]): CryptoAsset => ({
    id,
    symbol: "ETH",
    name: "Ether",
    chain,
    decimals: 18,
    kind: "crypto",
    splash: "sky",
    anchorUsd: "3239.88",
    priceOf: "rh:ETH",
  })),
];
