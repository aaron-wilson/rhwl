import { assetById } from "./assets";
import type { Asset } from "./types";

const crypto: Readonly<Record<string, string>> = {
  "rh:ETH":
    "Ether pays for every transaction on Robinhood Chain, an Ethereum layer 2. Holding a little keeps your wallet able to move.",
  "rh:WBTC":
    "Bitcoin, wrapped as a token so it can move and trade on Robinhood Chain. Each token is backed one to one.",
  "rh:USDG":
    "Global Dollar is a regulated stablecoin redeemable one to one for US dollars. Stock Token trades settle in it.",
  "rh:USDC":
    "USD Coin is a dollar stablecoin issued by Circle, redeemable one to one for US dollars.",
  "sol:SOL": "Solana's native token. It pays for transactions on the Solana network.",
  "eth:ETH": "Ether on Ethereum mainnet. Bridge it to Robinhood Chain to use it here.",
  "arb:ETH": "Ether on Arbitrum One. Bridge it to Robinhood Chain to use it here.",
  "base:ETH": "Ether on Base. Bridge it to Robinhood Chain to use it here.",
};

const names = (ids: readonly string[]) => ids.map((id) => assetById(id).symbol).join(", ");

/** A short plain-English description for the asset page. Memes are fictional and say so. */
export function aboutAsset(asset: Asset): string {
  switch (asset.kind) {
    case "stock":
      return `${asset.name} Stock Tokens track one share of ${asset.symbol} on ${asset.exchange} (${asset.sector.toLowerCase()}). They trade around the clock; dividends are reinvested by raising the shares each token represents.`;
    case "meme":
      return `${asset.name} is a fictional meme token from ${asset.launchpad}, priced against ${names(asset.quotes)}. It is not backed by anything.`;
    default:
      return crypto[asset.id] ?? `${asset.name} (${asset.symbol}).`;
  }
}
