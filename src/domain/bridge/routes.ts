import type { Asset, Chain } from "../../data/types";
import { amount, pow10, type Amount } from "../money/amount";

const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;
/** Dollars in 8 decimals, the scale prices use. */
const dollars = (cents: bigint) => cents * pow10(6);

export interface BridgeSide {
  readonly chain: Chain["id"];
  readonly asset: Asset;
  /** US dollars per whole token, 8 decimals. */
  readonly price: Amount;
}

export interface BridgeRoute {
  readonly id: "fast" | "canonical";
  readonly name: string;
  /** What the route charges, in cents. */
  readonly feeCents: bigint;
  /** Typical time until the funds arrive. */
  readonly seconds: number;
  readonly out: Amount;
  /** ETH delivered for gas on arrival, when refuel is on. */
  readonly refuel: Amount | undefined;
}

/** How much of the transfer refuel turns into destination ETH, in cents. */
export const REFUEL_CENTS = 300n;

/**
 * The routes between two networks. A fast relay (a fictional liquidity
 * network) works everywhere for a small fee. The canonical Robinhood Chain
 * bridge only links Ethereum, charges nothing, but is slow: about 12 minutes
 * in, and a 7-day challenge period out.
 */
export function bridgeRoutes(
  from: BridgeSide,
  to: BridgeSide,
  amountIn: Amount,
  options: { readonly refuel: boolean; readonly ethPrice: Amount },
): readonly BridgeRoute[] {
  const valueCents = (amountIn.base * from.price.base) / pow10(amountIn.decimals + 6);
  const canonical =
    (from.chain === "ethereum" && to.chain === "robinhood") ||
    (from.chain === "robinhood" && to.chain === "ethereum");
  const candidates = [
    {
      id: "fast" as const,
      name: "Hopline relay",
      feeCents: 40n + (valueCents * 12n) / 10_000n,
      seconds: 20,
    },
    ...(canonical
      ? [
          {
            id: "canonical" as const,
            name: "Robinhood Chain bridge",
            feeCents: 0n,
            seconds: from.chain === "ethereum" ? 12 * MINUTE : 7 * DAY,
          },
        ]
      : []),
  ];
  const refuelCents = options.refuel ? REFUEL_CENTS : 0n;
  return candidates.map((route) => {
    const leftCents = valueCents - route.feeCents - refuelCents;
    const out = amount(
      leftCents > 0n ? (dollars(leftCents) * pow10(to.asset.decimals)) / to.price.base : 0n,
      to.asset.decimals,
    );
    const refuel = options.refuel
      ? amount((dollars(refuelCents) * pow10(18)) / options.ethPrice.base, 18)
      : undefined;
    return { ...route, out, refuel };
  });
}

/** "20 sec", "12 min", "7 days". */
export function formatDuration(seconds: number): string {
  if (seconds < MINUTE) return `${seconds} sec`;
  if (seconds < DAY) return `${Math.round(seconds / MINUTE)} min`;
  const days = Math.round(seconds / DAY);
  return `${days} ${days === 1 ? "day" : "days"}`;
}
