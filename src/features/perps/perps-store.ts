import { assetById } from "../../data/assets";
import { PERPS_CONTRACT, type PerpMarket } from "../../data/perps";
import type { Amount } from "../../domain/money/amount";
import {
  centsToUsdg,
  equityCents,
  fundingCents,
  isLiquidated,
  triggerHit,
  type PerpSide,
  type Position,
} from "../../domain/perps/position";
import { createStore, useStore } from "../../lib/store";
import type { Providers } from "../../ports/providers";
import { showToast } from "../../ui/toast";
import { NETWORK_FEE } from "../transactions/actions";
import { runTransaction } from "../transactions/actions";

export interface OpenPosition extends Position {
  readonly id: number;
  readonly account: string;
  readonly market: PerpMarket;
  readonly takeProfit: Amount | undefined;
  readonly stopLoss: Amount | undefined;
}

/** Open perp positions. Session state: Reset demo closes them all. */
export const perpsStore = createStore<readonly OpenPosition[]>([]);
export const usePositions = () => useStore(perpsStore);
let nextId = 1;

type Deps = Pick<Providers, "clock" | "chain" | "simulation" | "market">;
const label = (side: PerpSide, market: PerpMarket, leverage: number) =>
  `${side} ${assetById(market.assetId).symbol} ${leverage}x`;

/** Posts collateral and opens at the mark once the transaction confirms. */
export async function openPosition(
  deps: Deps,
  order: {
    readonly account: string;
    readonly market: PerpMarket;
    readonly side: PerpSide;
    readonly collateralCents: bigint;
    readonly leverage: number;
    readonly takeProfit: Amount | undefined;
    readonly stopLoss: Amount | undefined;
  },
): Promise<boolean> {
  const margin = centsToUsdg(order.collateralCents);
  const debit = { assetId: "rh:USDG", quantity: { ...margin, base: -margin.base } };
  const tx = await runTransaction(deps, order.account, {
    kind: "contract",
    summary: { verb: "Opened", detail: label(order.side, order.market, order.leverage) },
    deltas: [debit],
    leverage: order.leverage,
    fee: NETWORK_FEE,
    to: PERPS_CONTRACT,
  });
  if (tx.machine.state !== "confirmed") return false;
  const now = deps.clock.now();
  const id = nextId;
  nextId += 1;
  perpsStore.set((list) => [
    ...list,
    { ...order, id, entryPrice: deps.market.price(order.market.assetId, now), openedAt: now },
  ]);
  return true;
}

/**
 * Closes a share of a position at the mark and pays out that share of its
 * equity. Trigger orders run without a signature: the exchange executes them.
 */
export async function closePosition(
  deps: Deps,
  id: number,
  percent: 25 | 50 | 100,
  trigger?: "take-profit" | "stop-loss",
): Promise<boolean> {
  const position = perpsStore.get().find((p) => p.id === id);
  if (position === undefined) return false;
  const now = deps.clock.now();
  const mark = deps.market.price(position.market.assetId, now);
  const equity = equityCents(
    position,
    mark,
    fundingCents(position, position.market.fundingCentiBps, now),
  );
  const payoutCents = ((equity > 0n ? equity : 0n) * BigInt(percent)) / 100n;
  const payout = { assetId: "rh:USDG", quantity: centsToUsdg(payoutCents) };
  const tx = await runTransaction(
    deps,
    position.account,
    {
      kind: "contract",
      summary: {
        verb:
          trigger === undefined
            ? "Closed"
            : trigger === "take-profit"
              ? "Took profit on"
              : "Stopped out of",
        detail: `${percent}% of ${label(position.side, position.market, position.leverage)}`,
      },
      deltas: [payout],
      fee: NETWORK_FEE,
      to: PERPS_CONTRACT,
      realizedCents: payoutCents - (position.collateralCents * BigInt(percent)) / 100n,
    },
    ...(trigger === undefined ? [] : [() => Promise.resolve(true)]),
  );
  if (tx.machine.state !== "confirmed") return false;
  perpsStore.set((list) =>
    percent === 100
      ? list.filter((p) => p.id !== id)
      : list.map((p) =>
          p.id === id
            ? { ...p, collateralCents: (p.collateralCents * BigInt(100 - percent)) / 100n }
            : p,
        ),
  );
  return true;
}

/**
 * Checks every position against the mark: liquidates any that have fallen to
 * maintenance, and fires take-profit and stop-loss orders.
 */
export function watchPositions(deps: Deps, now: Date): void {
  for (const position of perpsStore.get()) {
    const mark = deps.market.price(position.market.assetId, now);
    if (isLiquidated(position, mark)) {
      perpsStore.set((list) => list.filter((p) => p.id !== position.id));
      showToast(
        `${label(position.side, position.market, position.leverage)} was liquidated`,
        "error",
      );
      continue;
    }
    const hit = triggerHit(position.side, mark, position.takeProfit, position.stopLoss);
    if (hit !== undefined) {
      // Clear the trigger first so a slow close can't fire it twice.
      perpsStore.set((list) =>
        list.map((p) =>
          p.id === position.id ? { ...p, takeProfit: undefined, stopLoss: undefined } : p,
        ),
      );
      void closePosition(deps, position.id, 100, hit);
    }
  }
}
