import { parseAmount, type Amount } from "../../domain/money/amount";

export const inputClass =
  "h-12 w-full rounded-md bg-surface-2 px-3 text-body tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-focus";

/** A typed trigger price: empty means none. */
export const optionalPrice = (text: string): Amount | undefined | "invalid" => {
  if (text.trim() === "") return undefined;
  const value = parseAmount(text.trim().replace(/^\$/, ""), 8);
  return value === undefined || value.base <= 0n ? "invalid" : value;
};
/** A funding rate per 8 hours, from hundredths of a basis point. */
export const funding = (centiBps: number) => `${(centiBps / 10_000).toFixed(4)}% / 8h`;
