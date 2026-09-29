import * as z from "zod/mini";

/** A network the user adds by hand. The demo lists it and never connects to it. */
export interface CustomNetwork {
  readonly name: string;
  readonly rpcUrl: string;
  readonly chainId: number;
  readonly symbol: string;
}

const Form = z.object({
  name: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "Give the network a name"),
      z.maxLength(32, "Keep the name under 33 characters"),
    ),
  rpcUrl: z
    .string()
    .check(
      z.trim(),
      z.regex(
        /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d{2,5})?(\/\S*)?$/i,
        "Use an https:// address with a domain",
      ),
    ),
  chainId: z
    .string()
    .check(z.trim(), z.regex(/^[1-9]\d{0,9}$/, "Chain ID is a whole number above zero")),
  symbol: z.string().check(z.trim(), z.regex(/^[A-Z]{2,6}$/, "Symbol is 2 to 6 capital letters")),
});

export type FormField = keyof z.infer<typeof Form>;
export type FormInput = Record<FormField, string>;

/**
 * Validates the add-network form. Returns the network, or a message per field
 * that is wrong. A chain ID already in use is refused, since wallets route by it.
 */
export function parseCustomNetwork(
  input: FormInput,
  takenChainIds: readonly number[],
): { readonly network: CustomNetwork } | { readonly errors: Partial<Record<FormField, string>> } {
  const parsed = Form.safeParse(input);
  const errors: Partial<Record<FormField, string>> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        (field === "name" || field === "rpcUrl" || field === "chainId" || field === "symbol") &&
        errors[field] === undefined
      ) {
        errors[field] = issue.message;
      }
    }
    return { errors };
  }
  const chainId = Number(parsed.data.chainId);
  if (takenChainIds.includes(chainId))
    return { errors: { chainId: `Chain ID ${chainId} is already in use` } };
  return { network: { ...parsed.data, chainId } };
}
