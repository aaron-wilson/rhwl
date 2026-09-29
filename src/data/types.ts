import type { SplashName } from "../tokens/color";

export type ChainId = "robinhood" | "ethereum" | "arbitrum" | "base" | "solana";

export interface Chain {
  readonly id: ChainId;
  readonly name: string;
  /** EVM chain id; undefined for Solana. */
  readonly evmId: number | undefined;
  readonly gasSymbol: string;
}

interface AssetBase {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly chain: ChainId;
  readonly decimals: number;
  readonly splash: SplashName;
  /** Anchor price in US dollars as decimal text; the demo market walks from here. */
  readonly anchorUsd: string;
}

export interface CryptoAsset extends AssetBase {
  readonly kind: "crypto" | "stable";
  /** The same token on another network: priced exactly as this asset id. */
  readonly priceOf?: string;
}

/** One corporate action. The multiplier is shares per token after it, as decimal text. */
export interface CorporateAction {
  readonly date: string;
  readonly kind: "launch" | "dividend" | "split";
  readonly multiplier: string;
}

export interface StockToken extends AssetBase {
  readonly kind: "stock";
  readonly exchange: "NASDAQ" | "NYSE Arca" | "NYSE";
  readonly sector: string;
  readonly nextEarnings: string;
  readonly actions: readonly CorporateAction[];
}

export interface MemeToken extends AssetBase {
  readonly kind: "meme";
  readonly launchpad: string;
  /** Asset ids the token trades against. More than one means a basket (multipool) quote. */
  readonly quotes: readonly string[];
  readonly curve: { readonly progressBps: number; readonly graduated: boolean };
  readonly devShareBps: number;
  readonly holders: number;
  /** When the token launched on its launchpad (ISO 8601). */
  readonly launchedAt: string;
  /** What Rug Radar grades, as an on-chain scanner would read it. */
  readonly risk: MemeRisk;
}

export interface MemeRisk {
  readonly lpLock:
    | { readonly kind: "burned" }
    | { readonly kind: "locked"; readonly days: number }
    | { readonly kind: "unlocked" };
  /** Share of supply held by the ten largest holders, in basis points. */
  readonly top10Bps: number;
  /** The symbol of a token whose contract bytecode this one copies, if any. */
  readonly cloneOf: string | undefined;
  /** The deployer's earlier launches, and how many of them rugged. */
  readonly deployer: { readonly launches: number; readonly rugs: number };
}

export type Asset = CryptoAsset | StockToken | MemeToken;
