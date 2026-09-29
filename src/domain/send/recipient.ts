import { checksumStatus, toChecksumAddress } from "../keys/checksum";

export type Recipient =
  | { readonly status: "empty" }
  | { readonly status: "invalid"; readonly reason: string }
  | {
      readonly status: "ok";
      readonly address: string;
      /** The name it was reached by or is known as, if any. */
      readonly name: string | undefined;
    };

const HEX = /^0x[0-9a-fA-F]*$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const NAME = /^[a-z0-9-]+(\.rh|\.eth)?$/;

/**
 * Turns what was typed into an address, with a precise reason when it can't.
 * Mixed-case addresses must match their EIP-55 checksum; the result is always
 * in checksummed form.
 */
export function resolveRecipient(
  input: string,
  lookup: (name: string) => string | undefined,
  nameOf: (address: string) => string | undefined = () => undefined,
): Recipient {
  const text = input.trim();
  if (text === "") return { status: "empty" };
  if (/^0x/i.test(text)) {
    if (!HEX.test(`0x${text.slice(2)}`)) {
      return { status: "invalid", reason: "An address has only 0–9 and a–f after 0x" };
    }
    if (text.length !== 42) {
      return {
        status: "invalid",
        reason: `An address is 0x and 40 characters; this has ${text.length - 2}`,
      };
    }
    const typed = `0x${text.slice(2)}`;
    if (checksumStatus(typed) === "invalid") {
      return {
        status: "invalid",
        reason:
          "The capital letters don't match this address's checksum, so a character is likely wrong",
      };
    }
    const address = toChecksumAddress(typed);
    return { status: "ok", address, name: nameOf(address) };
  }
  if (BASE58.test(text)) {
    return {
      status: "invalid",
      reason: "That looks like a Solana address. This sends on Robinhood Chain.",
    };
  }
  const lower = text.toLowerCase();
  if (NAME.test(lower)) {
    const name = /\.(rh|eth)$/.test(lower) ? lower : `${lower}.rh`;
    const address = lookup(name);
    return address === undefined
      ? { status: "invalid", reason: `Nobody uses ${name}` }
      : { status: "ok", address: toChecksumAddress(address), name };
  }
  return { status: "invalid", reason: "Enter an address (0x…) or a name like stonks.rh" };
}

export interface KnownRecipient {
  readonly address: string;
  readonly label: string;
}

/**
 * Address poisoning: scammers send dust from an address that shares the first
 * and last characters of one you use, hoping you copy it from your history.
 * Returns the known recipient an address imitates, if any.
 */
export function lookalikeOf(
  address: string,
  known: readonly KnownRecipient[],
): KnownRecipient | undefined {
  const a = address.toLowerCase();
  const edges = (x: string) => [x.slice(2, 6), x.slice(-4)].join("…");
  return known.find((k) => {
    const b = k.address.toLowerCase();
    return b !== a && edges(b) === edges(a);
  });
}
