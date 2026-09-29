import * as z from "zod/mini";

const Hex = z.string().check(z.regex(/^0x[0-9a-fA-F]*$/));
const Address = z.string().check(z.regex(/^0x[0-9a-fA-F]{40}$/));

const Transaction = z.object({
  method: z.literal("eth_sendTransaction"),
  origin: z.string(),
  tx: z.object({ to: Address, data: z._default(Hex, "0x"), value: z._default(Hex, "0x0") }),
});

const PersonalSign = z.object({
  method: z.literal("personal_sign"),
  origin: z.string(),
  /** Hex-encoded bytes, as dApps send them, or plain text. */
  message: z.string(),
});

const TypedData = z.object({
  method: z.literal("eth_signTypedData_v4"),
  origin: z.string(),
  typedData: z.object({
    domain: z.object({ name: z.optional(z.string()), verifyingContract: z.optional(Address) }),
    primaryType: z.string(),
    message: z.record(z.string(), z.unknown()),
  }),
});

/** What a connected site asks the wallet for. Validated at the edge: a site is untrusted input. */
export const DappRequest = z.discriminatedUnion("method", [Transaction, PersonalSign, TypedData]);
export type DappRequest = z.infer<typeof DappRequest>;

/** The request, or undefined when it is malformed and must be refused. */
export function parseDappRequest(raw: unknown): DappRequest | undefined {
  const parsed = DappRequest.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
