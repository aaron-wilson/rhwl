import { useMemo, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { addressForName, nameForAddress } from "../../data/directory";
import { shortAddress } from "../../domain/keys/address";
import {
  lookalikeOf,
  resolveRecipient,
  type KnownRecipient,
  type Recipient,
} from "../../domain/send/recipient";
import { useAccounts, type AccountEntry } from "../accounts";

export interface RecipientField {
  readonly to: string;
  readonly setTo: (to: string) => void;
  /** The user has confirmed a lookalike address character by character. */
  readonly checked: boolean;
  readonly setChecked: (checked: boolean) => void;
  readonly recipient: Recipient;
  /** The recipient is the sending account itself. */
  readonly self: boolean;
  readonly lookalike: KnownRecipient | undefined;
  /** Past send recipients and the user's other accounts, for suggestions and the poisoning check. */
  readonly known: readonly KnownRecipient[];
  /** A recipient that can be sent to: valid, not self, and any lookalike confirmed. */
  readonly ready: boolean;
}

/** The recipient field's state and checks, shared by every screen that sends. */
export function useRecipient(account: AccountEntry | undefined, initial: string): RecipientField {
  const providers = useProviders();
  const accounts = useAccounts();
  const [to, setToText] = useState(initial);
  const [checked, setChecked] = useState(false);

  const known: readonly KnownRecipient[] = useMemo(() => {
    if (account === undefined) return [];
    const past = providers.chain
      .history(account.id)
      .filter((tx) => tx.request.kind === "send" && tx.request.to !== undefined)
      .map((tx) => tx.request.to ?? "");
    const unique = [...new Set(past.map((a) => a.toLowerCase()))];
    return [
      ...unique.map((address) => ({
        address,
        label: nameForAddress(address) ?? shortAddress(address),
      })),
      ...accounts
        .filter((a) => a.id !== account.id)
        .map((a) => ({ address: a.address, label: a.name })),
    ];
  }, [account, accounts, providers.chain]);

  const recipient = resolveRecipient(to, addressForName, nameForAddress);
  const self =
    recipient.status === "ok" &&
    account !== undefined &&
    recipient.address.toLowerCase() === account.address.toLowerCase();
  const lookalike = recipient.status === "ok" ? lookalikeOf(recipient.address, known) : undefined;
  return {
    to,
    setTo: (text) => {
      setToText(text);
      setChecked(false);
    },
    checked,
    setChecked,
    recipient,
    self,
    lookalike,
    known,
    ready: recipient.status === "ok" && !self && (lookalike === undefined || checked),
  };
}
