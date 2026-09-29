import type { ChainTx } from "../../ports/chain";
import { shortAddress } from "../keys/address";
import { lookalikeOf, type KnownRecipient } from "../send/recipient";

/** A lookalike address that sent the account a zero-value transfer, and whom it imitates. */
export interface PoisonedSender {
  readonly address: string;
  readonly imitates: KnownRecipient;
}

/**
 * The address-poisoning log: zero-value receipts from addresses that imitate
 * someone the account has sent to. Each sender is listed once.
 */
export function poisonedSenders(history: readonly ChainTx[]): PoisonedSender[] {
  const known: KnownRecipient[] = history
    .filter((tx) => tx.request.kind === "send" && tx.request.to !== undefined)
    .map((tx) => ({
      address: tx.request.to ?? "",
      label: tx.request.summary.detail?.replace(/^to /, "") ?? shortAddress(tx.request.to ?? ""),
    }));
  const found = new Map<string, PoisonedSender>();
  for (const tx of history) {
    const from = tx.request.to?.toLowerCase();
    const dust =
      tx.request.kind === "receive" && tx.request.deltas.every((d) => d.quantity.base === 0n);
    if (!dust || from === undefined || found.has(from)) continue;
    const imitates = lookalikeOf(from, known);
    if (imitates !== undefined) found.set(from, { address: from, imitates });
  }
  return [...found.values()];
}
