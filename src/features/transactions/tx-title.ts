import { assetById } from "../../data/assets";
import { amount } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import type { TxSummary } from "../../ports/chain";

export interface TitleOptions {
  /** Hide the amount, as when balances are hidden. */
  readonly hidden: boolean;
  /** Leave the amount out even when visible, e.g. where it is shown beside the title. */
  readonly withAmount?: boolean;
}

/** "Send 20 USDG to you.rh", or "Send USDG to you.rh" when amounts are hidden. */
export function txTitleText(
  summary: TxSummary,
  { hidden, withAmount = true }: TitleOptions,
): string {
  const parts = [summary.verb];
  if (summary.primary !== undefined) {
    const { symbol } = assetById(summary.primary.assetId);
    const { base, decimals } = summary.primary.quantity;
    const magnitude = amount(base < 0n ? -base : base, decimals);
    parts.push(hidden || !withAmount ? symbol : formatToken(magnitude, symbol));
  }
  if (summary.detail !== undefined) parts.push(summary.detail);
  return parts.join(" ");
}
