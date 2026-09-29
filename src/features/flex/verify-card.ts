import { decodeCard, type FlexCard } from "../../domain/flex/card";

export type Verification =
  | { readonly status: "malformed" }
  | { readonly status: "valid"; readonly card: FlexCard; readonly signer: string }
  | { readonly status: "invalid"; readonly card: FlexCard; readonly signer: string | undefined };

/**
 * Checks a card from its link alone: it must parse, and its signature must
 * recover to the signing address of the account it names. The curve code
 * loads only here.
 */
export async function verifyCard(text: string, signature: string): Promise<Verification> {
  const card = decodeCard(text);
  if (card === undefined) return { status: "malformed" };
  const { recoverSigner, signingAddress } = await import("../../domain/keys/signature");
  const signer = recoverSigner(text, signature);
  return signer !== undefined && signer === signingAddress(card.account)
    ? { status: "valid", card, signer }
    : { status: "invalid", card, signer };
}
