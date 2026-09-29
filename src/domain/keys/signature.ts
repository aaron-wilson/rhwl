import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { toChecksumAddress } from "./checksum";

/**
 * The demo's signing key for an account: sha256 of a fixed label and the
 * account id. Deterministic so a signed card verifies across reloads; never a
 * real key, and never derived from a recovery phrase.
 */
function demoSecret(account: string): Uint8Array {
  return sha256(utf8ToBytes(`rhwl demo signing key:${account}`));
}

function addressOf(publicKey: Uint8Array): string {
  // Uncompressed key without its 0x04 prefix; the address is the last 20 bytes of its hash.
  const hash = keccak_256(publicKey.slice(1));
  return toChecksumAddress(`0x${bytesToHex(hash.slice(-20))}`);
}

/** The address an account's demo key signs as. */
export function signingAddress(account: string): string {
  return addressOf(secp256k1.getPublicKey(demoSecret(account), false));
}

/** EIP-191 personal_sign digest: keccak256("\x19Ethereum Signed Message:\n" + length + message). */
export function personalMessageHash(message: string): Uint8Array {
  const body = utf8ToBytes(message);
  const prefix = utf8ToBytes(`\x19Ethereum Signed Message:\n${body.length}`);
  return keccak_256(concatBytes(prefix, body));
}

/** Signs `message` as personal_sign does: 65 bytes r ‖ s ‖ v as 0x-hex, v 27 or 28. */
export function signMessage(account: string, message: string): string {
  const recovered = secp256k1.sign(personalMessageHash(message), demoSecret(account), {
    prehash: false,
    format: "recovered",
  });
  // noble puts the recovery byte first; Ethereum puts it last, offset by 27.
  const v = (recovered[0] ?? 0) + 27;
  return `0x${bytesToHex(recovered.slice(1))}${v.toString(16)}`;
}

/** The address that signed `message`, or undefined when the signature is malformed. */
export function recoverSigner(message: string, signature: string): string | undefined {
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return undefined;
  const bytes = hexToBytes(signature.slice(2));
  const v = (bytes[64] ?? 0) - 27;
  if (v !== 0 && v !== 1) return undefined;
  try {
    const publicKey = secp256k1.recoverPublicKey(
      concatBytes(Uint8Array.of(v), bytes.slice(0, 64)),
      personalMessageHash(message),
      { prehash: false },
    );
    return addressOf(secp256k1.Point.fromBytes(publicKey).toBytes(false));
  } catch {
    return undefined;
  }
}

/** True when `signature` over `message` was made by `address`. */
export function verifyMessage(message: string, signature: string, address: string): boolean {
  return recoverSigner(message, signature)?.toLowerCase() === address.toLowerCase();
}
