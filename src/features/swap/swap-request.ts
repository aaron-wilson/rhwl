import { amount, type Amount } from "../../domain/money/amount";
import type { TxRequest } from "../../ports/chain";
import { NETWORK_FEE, NETWORK_FEE_COST } from "../transactions/actions";

/** The demo router; its contract is on the simulation's verified list. */
const ROUTER = "0x1111000000000000000000000000000000000001";
export const GAS = NETWORK_FEE.assetId;
export const feeCost = NETWORK_FEE_COST;

/** A swap of `amountIn` of one asset for `out` of another through the router. */
export function swapRequest(
  fromId: string,
  toId: string,
  toSymbol: string,
  amountIn: Amount,
  out: Amount,
): TxRequest {
  const paid = amount(-amountIn.base, amountIn.decimals);
  return {
    kind: "swap",
    summary: {
      verb: "Swap",
      primary: { assetId: fromId, quantity: paid },
      detail: `for ${toSymbol}`,
    },
    deltas: [
      { assetId: fromId, quantity: paid },
      { assetId: toId, quantity: out },
    ],
    fee: NETWORK_FEE,
    to: ROUTER,
  };
}
