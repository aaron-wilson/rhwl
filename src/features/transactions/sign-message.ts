import { signerStore, type MessageRequest } from "./signer";

export interface SignedMessage {
  readonly payload: string;
  readonly signature: string;
  /** The address the signature recovers to. */
  readonly signer: string;
}

/**
 * Asks the account to sign a message through the sign sheet, then signs it with
 * the account's demo key. Resolves undefined when the user refuses. The curve
 * code loads only on first use.
 */
export async function signMessageAs(
  account: string,
  message: MessageRequest,
): Promise<SignedMessage | undefined> {
  const approved = await signerStore.get().approveMessage(message, account);
  if (!approved) return undefined;
  const { signMessage, signingAddress } = await import("../../domain/keys/signature");
  return {
    payload: message.payload,
    signature: signMessage(account, message.payload),
    signer: signingAddress(account),
  };
}
