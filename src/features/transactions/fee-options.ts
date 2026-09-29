import { assetById } from "../../data/assets";
import { ethFeeAt, feeInToken, type Speed } from "../../domain/fees/gas";
import { amount, type Amount } from "../../domain/money/amount";
import { createStore, useStore } from "../../lib/store";
import type { BalanceDelta, Holding, TxRequest } from "../../ports/chain";
import type { Market } from "../../ports/market";

const GAS = "rh:ETH";
/** Sponsored transactions each session: a paymaster promo, as a CEX-backed wallet might run. */
export const SPONSORED_PER_SESSION = 3;

export const sponsoredLeftStore = createStore(SPONSORED_PER_SESSION);
export const useSponsoredLeft = () => useStore(sponsoredLeftStore);

export function spendSponsorship(): void {
  sponsoredLeftStore.set((left) => Math.max(0, left - 1));
}

export interface FeeOption {
  readonly id: string;
  readonly label: string;
  /** The fee as a debit, ready for the request. */
  readonly fee: BalanceDelta;
  readonly sponsored: boolean;
  /** False when the balance can't cover this fee on top of the transaction itself. */
  readonly affordable: boolean;
}

const debit = (value: Amount): Amount => amount(-value.base, value.decimals);

/**
 * Ways to pay a Robinhood Chain fee: sponsored while the promo lasts, in ETH,
 * or in USDG or any held Stock Token through the paymaster. Empty when the
 * fee is not a Robinhood Chain ETH fee (another network's leg, or no fee).
 */
export function feeOptions(options: {
  readonly request: TxRequest;
  readonly speed: Speed;
  readonly holdings: readonly Holding[];
  readonly market: Market;
  readonly now: Date;
  readonly sponsoredLeft: number;
}): readonly FeeOption[] {
  const { request, speed, holdings, market, now, sponsoredLeft } = options;
  if (request.fee.assetId !== GAS || request.fee.quantity.base === 0n) return [];
  const base = amount(-request.fee.quantity.base, request.fee.quantity.decimals);
  const ethFee = ethFeeAt(base, speed);
  const ethPrice = market.price(GAS, now);
  const affordable = (assetId: string, fee: Amount) => {
    const held = holdings.find((h) => h.assetId === assetId)?.quantity.base ?? 0n;
    const outflow = request.deltas
      .filter((d) => d.assetId === assetId && d.quantity.base < 0n)
      .reduce((sum, d) => sum - d.quantity.base, 0n);
    return held - outflow >= fee.base;
  };
  const inToken = (assetId: string): FeeOption => {
    const asset = assetById(assetId);
    const fee = feeInToken(ethFee, ethPrice, market.price(assetId, now), asset.decimals);
    return {
      id: assetId,
      label: asset.symbol,
      fee: { assetId, quantity: debit(fee) },
      sponsored: false,
      affordable: affordable(assetId, fee),
    };
  };
  const stocks = holdings
    .filter((h) => assetById(h.assetId).kind === "stock")
    .map((h) => h.assetId);
  return [
    ...(sponsoredLeft > 0
      ? [
          {
            id: "sponsored",
            label: "Covered by Robinhood",
            fee: { assetId: GAS, quantity: amount(0n, 18) },
            sponsored: true,
            affordable: true,
          },
        ]
      : []),
    {
      id: GAS,
      label: "ETH",
      fee: { assetId: GAS, quantity: debit(ethFee) },
      sponsored: false,
      affordable: affordable(GAS, ethFee),
    },
    inToken("rh:USDG"),
    ...stocks.map(inToken),
  ];
}
