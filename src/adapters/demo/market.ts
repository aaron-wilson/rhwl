import { assetById } from "../../data/assets";
import type { Asset } from "../../data/types";
import { ANCHOR_AT } from "../../data/world";
import { lastClose, marketState } from "../../domain/market/hours";
import { amount, parseAmount, type Amount } from "../../domain/money/amount";
import { randomAt } from "../../lib/prng";
import type { Market, PricePoint } from "../../ports/market";

const PRICE_DECIMALS = 8;
const MINUTE = 60_000;
/** Noise octaves in minutes: 5 min jitter, hourly, daily, weekly and monthly moves. */
const OCTAVES = [5, 60, 1440, 10080, 43200] as const;

/** Log-price amplitude per octave, by asset kind. Memes move roughly ten times as much as stocks. */
const VOLATILITY: Record<Asset["kind"], readonly number[]> = {
  stable: [0.00004, 0.00003, 0, 0, 0],
  stock: [0.0015, 0.004, 0.012, 0.03, 0.06],
  crypto: [0.002, 0.006, 0.02, 0.04, 0.08],
  meme: [0.02, 0.05, 0.12, 0.25, 0.4],
};

/** Stock tokens trade 24/7 on-chain, but move less while the exchange is shut. */
function regime(asset: Asset, at: Date): number {
  if (asset.kind !== "stock") return 1;
  const { session } = marketState(at);
  return session === "open" ? 1 : session === "closed" ? 0.35 : 0.6;
}

/** Knot values drawn so far; neighbouring samples share knots, and hashing the seed is the costly part. */
const knots = new Map<string, number>();
const KNOT_CACHE_SIZE = 50_000;

function knot(key: string): number {
  let value = knots.get(key);
  if (value === undefined) {
    if (knots.size >= KNOT_CACHE_SIZE) knots.clear();
    value = randomAt(key) * 2 - 1;
    knots.set(key, value);
  }
  return value;
}

function smoothNoise(key: string, x: number): number {
  const k = Math.floor(x);
  const f = x - k;
  const a = knot(`${key}:${k}`);
  const b = knot(`${key}:${k + 1}`);
  return a + (b - a) * f * f * (3 - 2 * f);
}

/**
 * A deterministic market: each price is a pure function of (seed, asset, time),
 * built from layered smooth noise, so any instant can be priced without
 * replaying history and the same link always shows the same chart.
 */
export function createDemoMarket(seed: string): Market {
  const anchors = new Map<string, number>();
  const anchorBases = new Map<string, number>();

  function logLevel(asset: Asset, at: Date): number {
    const minutes = at.getTime() / MINUTE;
    const factor = regime(asset, at);
    const amps = VOLATILITY[asset.kind];
    return OCTAVES.reduce((sum, scale, i) => {
      const amp = (amps[i] ?? 0) * (i < 2 ? factor : 1);
      return sum + amp * smoothNoise(`${seed}:${asset.id}:${i}`, minutes / scale);
    }, 0);
  }

  const seriesCache = new Map<string, readonly PricePoint[]>();
  const SERIES_CACHE_SIZE = 64;

  function price(assetId: string, at: Date): Amount {
    const asset = assetById(assetId);
    if ((asset.kind === "crypto" || asset.kind === "stable") && asset.priceOf !== undefined) {
      return price(asset.priceOf, at);
    }
    let anchor = anchors.get(assetId);
    if (anchor === undefined) {
      anchor = logLevel(asset, ANCHOR_AT);
      anchors.set(assetId, anchor);
    }
    let anchorBase = anchorBases.get(assetId);
    if (anchorBase === undefined) {
      anchorBase = Number(parseAmount(asset.anchorUsd, PRICE_DECIMALS)?.base ?? 0n);
      anchorBases.set(assetId, anchorBase);
    }
    const ratio = Math.exp(logLevel(asset, at) - anchor);
    // The only float step: the simulated move. The result is an exact integer from here on.
    return amount(BigInt(Math.round(anchorBase * ratio)), PRICE_DECIMALS);
  }

  return {
    price,
    series(assetId, from, to, points) {
      const key = `${assetId}|${from.getTime()}|${to.getTime()}|${points}`;
      const hit = seriesCache.get(key);
      if (hit !== undefined) {
        // Refresh recency: Map keeps insertion order, so the oldest entry is evicted first.
        seriesCache.delete(key);
        seriesCache.set(key, hit);
        return hit;
      }
      const span = to.getTime() - from.getTime();
      const result = Array.from({ length: points }, (_, i) => {
        const at = new Date(from.getTime() + (points === 1 ? 0 : (span * i) / (points - 1)));
        return { at, price: price(assetId, at) };
      });
      seriesCache.set(key, result);
      if (seriesCache.size > SERIES_CACHE_SIZE) {
        const oldest = seriesCache.keys().next().value;
        if (oldest !== undefined) seriesCache.delete(oldest);
      }
      return result;
    },
    reference(assetId, at) {
      const refAt =
        assetById(assetId).kind === "stock"
          ? lastClose(at)
          : new Date(at.getTime() - 24 * 60 * MINUTE);
      return { at: refAt, price: price(assetId, refAt) };
    },
  };
}
