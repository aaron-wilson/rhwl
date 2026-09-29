/** The three ERC-20/721 calls a wallet must recognize to explain approvals and transfers. */
export type Call =
  | { readonly name: "approve"; readonly spender: string; readonly value: bigint }
  | { readonly name: "transfer"; readonly to: string; readonly value: bigint }
  | { readonly name: "setApprovalForAll"; readonly operator: string; readonly approved: boolean }
  | { readonly name: "unknown"; readonly selector: string };

const SELECTORS = new Map<string, "approve" | "transfer" | "setApprovalForAll">([
  ["0x095ea7b3", "approve"],
  ["0xa9059cbb", "transfer"],
  ["0xa22cb465", "setApprovalForAll"],
]);

const word = (data: string, index: number): string | undefined => {
  const hex = data.slice(10 + index * 64, 10 + (index + 1) * 64);
  return hex.length === 64 ? hex : undefined;
};
const asAddress = (w: string) => `0x${w.slice(24)}`.toLowerCase();

/** Decodes calldata by its 4-byte selector. Anything short or unrecognized is "unknown". */
export function decodeCall(data: string): Call {
  const selector = data.slice(0, 10).toLowerCase();
  const name = SELECTORS.get(selector);
  const [a, b] = [word(data, 0), word(data, 1)];
  if (name === undefined || a === undefined || b === undefined)
    return { name: "unknown", selector };
  if (name === "approve") return { name, spender: asAddress(a), value: BigInt(`0x${b}`) };
  if (name === "transfer") return { name, to: asAddress(a), value: BigInt(`0x${b}`) };
  return { name, operator: asAddress(a), approved: BigInt(`0x${b}`) !== 0n };
}

/** At or above 2^128 no real supply can be reached, so the grant is treated as unlimited. */
export const UNLIMITED_FROM = 2n ** 128n;
