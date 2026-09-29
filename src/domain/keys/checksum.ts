import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

const SHAPE = /^0x[0-9a-fA-F]{40}$/;

/**
 * EIP-55 mixed-case checksum: each letter is uppercase when the matching nibble
 * of keccak256(lowercase hex) is 8 or more. Throws on anything not shaped like
 * an address.
 */
export function toChecksumAddress(address: string): string {
  if (!SHAPE.test(address)) throw new RangeError(`Not an address: ${address}`);
  const hex = address.slice(2).toLowerCase();
  const hash = bytesToHex(keccak_256(utf8ToBytes(hex)));
  let out = "0x";
  for (let i = 0; i < hex.length; i += 1) {
    const char = hex.charAt(i);
    out += Number.parseInt(hash.charAt(i), 16) >= 8 ? char.toUpperCase() : char;
  }
  return out;
}

/**
 * "valid": mixed case that matches its checksum. "none": all one case, which
 * carries no checksum (EIP-55 leaves these unchecked). "invalid": mixed case
 * that does not match, the sign of a mistyped character.
 */
export function checksumStatus(address: string): "valid" | "none" | "invalid" {
  const hex = address.slice(2);
  if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) return "none";
  return toChecksumAddress(address) === address ? "valid" : "invalid";
}
