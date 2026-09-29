import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRandom } from "../../lib/prng";
import {
  checkMnemonic,
  checkPrivateKey,
  entropyToMnemonic,
  generateMnemonic,
  isAddress,
} from "./mnemonic";
import { WORDLIST_SHA256 } from "./wordlist";

const text = readFileSync(join(process.cwd(), "src/data/bip39-english.txt"), "utf8");
const words = text.trim().split("\n");
const hex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], (b) => Number.parseInt(b, 16));

describe("BIP-39 wordlist", () => {
  it("is the canonical English list", () => {
    expect(createHash("sha256").update(text).digest("hex")).toBe(WORDLIST_SHA256);
    expect(words).toHaveLength(2048);
  });
});

describe("mnemonics (official BIP-39 test vectors)", () => {
  it.each([
    [
      "00000000000000000000000000000000",
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    ],
    [
      "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f",
      "legal winner thank year wave sausage worth useful legal winner thank yellow",
    ],
    ["ffffffffffffffffffffffffffffffff", "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"],
    [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
    ],
  ])("encodes %s", async (entropy, phrase) => {
    expect((await entropyToMnemonic(hex(entropy), words)).join(" ")).toBe(phrase);
    expect(await checkMnemonic(phrase, words)).toMatchObject({ ok: true });
  });

  it("generates a valid, repeatable phrase from a seeded source", async () => {
    const a = await generateMnemonic(words, createRandom("demo"));
    const b = await generateMnemonic(words, createRandom("demo"));
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
    expect(await checkMnemonic(a.join(" "), words)).toMatchObject({ ok: true });
  });

  it.each([
    ["abandon abandon", /12 or 24 words; this has 2/],
    [
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon walk",
      /checksum/,
    ],
    [
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abaut",
      /Word 12, "abaut"/,
    ],
    ["zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong zoo", /checksum/],
  ])("rejects %j with a precise reason", async (phrase, reason) => {
    const result = await checkMnemonic(phrase, words);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });

  it("tolerates extra spaces and capitals", async () => {
    expect(
      await checkMnemonic("  Zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo WRONG ", words),
    ).toMatchObject({ ok: true });
  });
});

describe("private keys and addresses", () => {
  it.each([
    [`0x${"ab".repeat(32)}`, true],
    ["ab".repeat(32), true],
    ["ab".repeat(31), false],
    [`0x${"0".repeat(64)}`, false],
    [`0x${"zz".repeat(32)}`, false],
  ])("private key %s → %s", (key, ok) => {
    expect(checkPrivateKey(key).ok).toBe(ok);
  });

  it.each([
    ["0x8f3a41c2b7d9e05a6f1c3b2d4e8a9f07c6b5c21e", true],
    ["0x8F3A41C2B7D9E05A6F1C3B2D4E8A9F07C6B5C21E", true],
    ["8f3a41c2b7d9e05a6f1c3b2d4e8a9f07c6b5c21e", false],
    ["0x8f3a41c2", false],
    // EIP-55 checksummed, and the same with one letter's case flipped.
    ["0x8f3A41c2B7d9e05a6f1c3b2d4e8a9F07C6B5C21E", true],
    ["0x8f3A41c2B7d9e05a6f1c3b2d4e8a9F07C6B5C21e", false],
  ])("address %s → %s", (address, ok) => {
    expect(isAddress(address)).toBe(ok);
  });
});
