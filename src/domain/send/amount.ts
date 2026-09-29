import { amount, parseAmount, pow10, sub, type Amount } from "../money/amount";

export type AmountUnit = "token" | "usd";

/**
 * A typed amount in tokens, or in dollars converted at `price` (US dollars per
 * token, 8 decimals) and rounded down so a dollar amount never overspends.
 * Undefined for anything that is not a positive amount.
 */
export function parseSendAmount(
  text: string,
  unit: AmountUnit,
  decimals: number,
  price: Amount,
): Amount | undefined {
  if (unit === "token") {
    const value = parseAmount(text.trim(), decimals);
    return value === undefined || value.base <= 0n ? undefined : value;
  }
  const cents = parseAmount(text.trim().replace(/^\$/, ""), 2);
  if (cents === undefined || cents.base <= 0n || price.base <= 0n) return undefined;
  // cents × 10^(decimals + price decimals − 2) / price
  const base = (cents.base * pow10(decimals + price.decimals - 2)) / price.base;
  return base > 0n ? amount(base, decimals) : undefined;
}

/** The most that can be sent: all of it, less the fee when the fee is paid in the same token. */
export function maxSendable(balance: Amount, feeInSameToken: Amount | undefined): Amount {
  if (feeInSameToken === undefined) return balance;
  const left = sub(balance, feeInSameToken);
  return left.base > 0n ? left : amount(0n, balance.decimals);
}

export type SendProblem = "insufficient" | "fee";

/** Why a send can't go ahead, checked before the dry run so the form can say so. */
export function sendProblem(options: {
  readonly amount: Amount;
  readonly balance: Amount;
  /** The fee, positive, in the gas token. */
  readonly fee: Amount;
  readonly gasBalance: Amount;
  readonly sendingGasToken: boolean;
}): SendProblem | undefined {
  const { amount: value, balance, fee, gasBalance, sendingGasToken } = options;
  if (value.base > balance.base) return "insufficient";
  const gasNeeded = sendingGasToken ? value.base + fee.base : fee.base;
  if (gasNeeded > gasBalance.base) return sendingGasToken ? "insufficient" : "fee";
  return undefined;
}
