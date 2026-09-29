import { amount } from "../../domain/money/amount";
import type { BalanceDelta } from "../../ports/chain";

/** The demo network's flat fee for a simple transaction: 0.000004 ETH, as a debit. */
export const NETWORK_FEE: BalanceDelta = {
  assetId: "rh:ETH",
  quantity: amount(-4_000_000_000_000n, 18),
};

/** The network fee as a positive amount, for balance checks and display. */
export const NETWORK_FEE_COST = amount(-NETWORK_FEE.quantity.base, NETWORK_FEE.quantity.decimals);
