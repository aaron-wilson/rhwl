import { checksumStatus } from "./checksum";
/**
 * BIP-39 recovery phrases: 12 or 24 words encoding 128 or 256 bits of entropy
 * plus a checksum (the first bits of its SHA-256). Hashing uses the platform's
 * `crypto.subtle`, so no library is needed.
 */
async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  // Copy into a plain ArrayBuffer-backed array, which is what SubtleCrypto accepts.
  return new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)));
}

const bitsOf = (bytes: Uint8Array) =>
  [...bytes].map((b) => b.toString(2).padStart(8, "0")).join("");

/** Encodes entropy (16 or 32 bytes) as a phrase. */
export async function entropyToMnemonic(
  entropy: Uint8Array,
  words: readonly string[],
): Promise<string[]> {
  if (entropy.length !== 16 && entropy.length !== 32)
    throw new RangeError("Entropy must be 16 or 32 bytes");
  const checksumBits = entropy.length / 4;
  const bits = bitsOf(entropy) + bitsOf(await sha256(entropy)).slice(0, checksumBits);
  return Array.from(
    { length: bits.length / 11 },
    (_, i) => words[Number.parseInt(bits.slice(i * 11, i * 11 + 11), 2)] ?? "",
  );
}

/** A fresh 12-word phrase from a random source (seeded in the demo, so tests are repeatable). */
export function generateMnemonic(
  words: readonly string[],
  random: () => number,
): Promise<string[]> {
  const entropy = Uint8Array.from({ length: 16 }, () => Math.floor(random() * 256));
  return entropyToMnemonic(entropy, words);
}

export type PhraseCheck =
  | { readonly ok: true; readonly words: readonly string[] }
  | { readonly ok: false; readonly reason: string };

/** Validates a typed phrase with a precise reason, the way a careful wallet explains a typo. */
export async function checkMnemonic(input: string, words: readonly string[]): Promise<PhraseCheck> {
  const typed = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (typed.length !== 12 && typed.length !== 24) {
    return { ok: false, reason: `Use 12 or 24 words; this has ${typed.length}` };
  }
  const index = new Map(words.map((word, i) => [word, i]));
  const unknown = typed.findIndex((word) => !index.has(word));
  if (unknown !== -1)
    return {
      ok: false,
      reason: `Word ${unknown + 1}, "${typed[unknown] ?? ""}", isn't a recovery word`,
    };
  const bits = typed.map((word) => (index.get(word) ?? 0).toString(2).padStart(11, "0")).join("");
  const entropyBits = (bits.length * 32) / 33;
  const entropy = Uint8Array.from({ length: entropyBits / 8 }, (_, i) =>
    Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2),
  );
  const expected = bitsOf(await sha256(entropy)).slice(0, bits.length - entropyBits);
  if (bits.slice(entropyBits) !== expected) {
    return {
      ok: false,
      reason: "The checksum doesn't match. A word is probably mistyped or out of order.",
    };
  }
  return { ok: true, words: typed };
}

/** A 32-byte hex private key, with or without 0x, that is not zero. */
export function checkPrivateKey(input: string): { readonly ok: boolean; readonly reason?: string } {
  const hex = input.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(hex))
    return { ok: false, reason: "A private key is 64 hexadecimal characters" };
  if (/^0+$/.test(hex)) return { ok: false, reason: "That key is zero, which is not a valid key" };
  return { ok: true };
}

/** An address: 0x and 40 hex characters, and if mixed case, a matching EIP-55 checksum. */
export function isAddress(input: string): boolean {
  const text = input.trim();
  return /^0x[0-9a-fA-F]{40}$/.test(text) && checksumStatus(text) !== "invalid";
}
