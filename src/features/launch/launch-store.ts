import { useMemo } from "react";
import { assetById } from "../../data/assets";
import { memeTokens } from "../../data/memes";
import type { MemeToken } from "../../data/types";
import {
  buyOnCurve,
  curveFor,
  curvePrice,
  isGraduated,
  progressBps,
  sellOnCurve,
  type Curve,
} from "../../domain/launch/curve";
import { amount, parseAmount, pow10, type Amount } from "../../domain/money/amount";
import { createStore, useStore } from "../../lib/store";
import type { Providers } from "../../ports/providers";
import { showToast } from "../../ui/toast";
import { NETWORK_FEE } from "../transactions/actions";
import { runTransaction } from "../transactions/actions";

interface LaunchState {
  readonly curves: Readonly<Record<string, Curve>>;
  /** When each token graduated during this session, for the graduation moment. */
  readonly graduatedAt: Readonly<Record<string, Date>>;
}

function seed(): LaunchState {
  const curves: Record<string, Curve> = {};
  for (const meme of memeTokens) {
    const price = parseAmount(meme.anchorUsd, 8) ?? amount(0n, 8);
    curves[meme.id] = curveFor(price, meme.curve.graduated ? 10_000 : meme.curve.progressBps);
  }
  return { curves, graduatedAt: {} };
}

/** Every launch's bonding curve. Session state: Reset demo restores the catalog's. */
export const launchStore = createStore<LaunchState>(seed());

export interface LaunchView {
  readonly meme: MemeToken;
  readonly curve: Curve;
  readonly graduated: boolean;
  readonly progressBps: number;
  /** Dollars per token on the curve, 8 decimals. */
  readonly price: Amount;
  readonly graduatedAt: Date | undefined;
}

function view(state: LaunchState, meme: MemeToken): LaunchView {
  const curve = state.curves[meme.id] ?? curveFor(amount(1n, 8), 10_000);
  return {
    meme,
    curve,
    graduated: isGraduated(curve),
    progressBps: progressBps(curve),
    price: curvePrice(curve),
    graduatedAt: state.graduatedAt[meme.id],
  };
}

export function useLaunches(): readonly LaunchView[] {
  const state = useStore(launchStore);
  return useMemo(() => memeTokens.map((meme) => view(state, meme)), [state]);
}

export function useLaunch(id: string): LaunchView | undefined {
  const state = useStore(launchStore);
  return useMemo(() => {
    const meme = memeTokens.find((m) => m.id === id);
    return meme === undefined ? undefined : view(state, meme);
  }, [state, id]);
}

type Deps = Pick<Providers, "clock" | "chain" | "simulation" | "market">;

/** A quote-asset amount in dollars (8 decimals) at the market price. */
function toUsd(deps: Deps, assetId: string, value: Amount): Amount {
  const price = deps.market.price(assetId, deps.clock.now());
  return amount((value.base * price.base) / pow10(value.decimals), 8);
}

/** Dollars (8 decimals) as the quote asset at the market price. */
export function quoteFromUsd(deps: Deps, assetId: string, usd: Amount): Amount {
  const { decimals } = assetById(assetId);
  const price = deps.market.price(assetId, deps.clock.now());
  return amount((usd.base * pow10(decimals)) / price.base, decimals);
}

/** What a buy of `spend` (in the quote asset) would do right now. */
export function previewBuy(deps: Deps, meme: MemeToken, spend: Amount) {
  const curve = launchStore.get().curves[meme.id];
  if (curve === undefined) return undefined;
  return buyOnCurve(curve, toUsd(deps, meme.quotes[0] ?? "rh:ETH", spend));
}

export function previewSell(meme: MemeToken, tokens: Amount) {
  const curve = launchStore.get().curves[meme.id];
  return curve === undefined ? undefined : sellOnCurve(curve, tokens);
}

/**
 * Buys on the curve with the launch's quote asset. If the buy fills the curve,
 * only what that costs is spent and the token graduates.
 */
export async function buyOnLaunch(
  deps: Deps,
  account: string,
  meme: MemeToken,
  spend: Amount,
): Promise<boolean> {
  const quote = meme.quotes[0] ?? "rh:ETH";
  const trade = previewBuy(deps, meme, spend);
  if (trade === undefined || trade.tokens.base === 0n) return false;
  const paid =
    trade.refund.base === 0n
      ? spend
      : amount(
          (spend.base * trade.usd.base) / (trade.usd.base + trade.refund.base),
          spend.decimals,
        );
  const tx = await runTransaction(deps, account, {
    kind: "trade",
    summary: {
      verb: "Bought",
      primary: { assetId: meme.id, quantity: trade.tokens },
      detail: "on the curve",
    },
    deltas: [
      { assetId: quote, quantity: amount(-paid.base, paid.decimals) },
      { assetId: meme.id, quantity: trade.tokens },
    ],
    fee: NETWORK_FEE,
  });
  if (tx.machine.state !== "confirmed") return false;
  const now = deps.clock.now();
  launchStore.set((state) => ({
    curves: { ...state.curves, [meme.id]: trade.curve },
    graduatedAt: trade.graduated ? { ...state.graduatedAt, [meme.id]: now } : state.graduatedAt,
  }));
  if (trade.graduated) showToast(`${meme.name} graduated from the curve`, "success");
  return true;
}

/** Sells back into the curve for the quote asset. */
export async function sellOnLaunch(
  deps: Deps,
  account: string,
  meme: MemeToken,
  tokens: Amount,
): Promise<boolean> {
  const quote = meme.quotes[0] ?? "rh:ETH";
  const trade = previewSell(meme, tokens);
  if (trade === undefined || trade.tokens.base === 0n) return false;
  const received = quoteFromUsd(deps, quote, trade.usd);
  const tx = await runTransaction(deps, account, {
    kind: "trade",
    summary: {
      verb: "Sold",
      primary: { assetId: meme.id, quantity: amount(-trade.tokens.base, 18) },
      detail: "to the curve",
    },
    deltas: [
      { assetId: meme.id, quantity: amount(-trade.tokens.base, 18) },
      { assetId: quote, quantity: received },
    ],
    fee: NETWORK_FEE,
  });
  if (tx.machine.state !== "confirmed") return false;
  launchStore.set((state) => ({ ...state, curves: { ...state.curves, [meme.id]: trade.curve } }));
  return true;
}
