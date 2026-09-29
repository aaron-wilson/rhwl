/** SHA-256 of the canonical BIP-39 English list (bitcoin/bips, bip-0039/english.txt). */
export const WORDLIST_SHA256 = "2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda";

let cached: Promise<readonly string[]> | undefined;

/** The 2,048 BIP-39 English words, loaded on first use so they never ride along on Home. */
export function loadWordlist(): Promise<readonly string[]> {
  cached ??= import("../../data/bip39-english.txt?raw").then(({ default: text }) => {
    const words = text.trim().split("\n");
    if (words.length !== 2048)
      throw new Error(`BIP-39 list has ${words.length} words, expected 2048`);
    return words;
  });
  return cached;
}
