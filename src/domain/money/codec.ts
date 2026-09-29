import * as z from "zod/mini";
import { amount, type Amount } from "./amount";

/** JSON cannot hold bigint, so amounts travel as a decimal string of base units. */
export const AmountJson = z.object({
  base: z.string().check(z.regex(/^-?\d+$/, "base must be an integer string")),
  decimals: z.int().check(z.minimum(0), z.maximum(36)),
});
export type AmountJson = z.infer<typeof AmountJson>;

export function encodeAmount(value: Amount): AmountJson {
  return { base: value.base.toString(), decimals: value.decimals };
}

export function decodeAmount(json: unknown): Amount {
  const parsed = AmountJson.parse(json);
  return amount(BigInt(parsed.base), parsed.decimals);
}
