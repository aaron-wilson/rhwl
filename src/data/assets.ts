import { cryptoAssets } from "./crypto";
import { memeTokens } from "./memes";
import { stockTokens } from "./stocks";
import type { Asset } from "./types";

/** The fake world's assets. Tickers are real equities; every meme and launchpad is fictional. */
export const assets: readonly Asset[] = [...cryptoAssets, ...stockTokens, ...memeTokens];

const byId = new Map(assets.map((asset) => [asset.id, asset]));

export function assetById(id: string): Asset {
  const asset = byId.get(id);
  if (asset === undefined) throw new Error(`Unknown asset ${id}`);
  return asset;
}
