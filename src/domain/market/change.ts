import { divRound, type Amount } from "../money/amount";

/** Change from `reference` to `current` in basis points: 214n means +2.14%. */
export function changeBps(current: Amount, reference: Amount): bigint {
  if (current.decimals !== reference.decimals) throw new RangeError("Prices must share decimals");
  if (reference.base === 0n) return 0n;
  return divRound((current.base - reference.base) * 10_000n, reference.base);
}
