import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { describe, expect, it } from "vitest";
import {
  personalMessageHash,
  recoverSigner,
  signingAddress,
  signMessage,
  verifyMessage,
} from "./signature";

describe("personal_sign", () => {
  it("hashes with the EIP-191 prefix", () => {
    // keccak256("\x19Ethereum Signed Message:\n11hello world"), a widely published vector.
    expect(bytesToHex(personalMessageHash("hello world"))).toBe(
      "d9eba16ed0ecae432b71fe008c98cc872bb4cc214d3220a36f365326cf807d68",
    );
  });

  it("recovers the address of the private key 1 from its own signature", () => {
    // Private key 0x…01 has the well-known address 0x7E5F…5Bdf.
    const secret = hexToBytes(`${"0".repeat(63)}1`);
    const sig = secp256k1.sign(personalMessageHash("rhwl"), secret, {
      prehash: false,
      format: "recovered",
    });
    const eth = `0x${bytesToHex(sig.slice(1))}${((sig[0] ?? 0) + 27).toString(16)}`;
    expect(recoverSigner("rhwl", eth)).toBe("0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
  });

  it("signs as each account's demo key and verifies", () => {
    const signature = signMessage("main", "I hold NVDA");
    expect(signature).toMatch(/^0x[0-9a-f]{128}(1b|1c)$/);
    expect(verifyMessage("I hold NVDA", signature, signingAddress("main"))).toBe(true);
    expect(verifyMessage("I hold NVDA", signature, signingAddress("degen"))).toBe(false);
  });

  it("is deterministic", () => {
    expect(signMessage("main", "x")).toBe(signMessage("main", "x"));
    expect(signingAddress("main")).toBe(signingAddress("main"));
  });

  it("fails verification after a one-byte change to the message or signature", () => {
    const signature = signMessage("main", "gain +42.10%");
    expect(verifyMessage("gain +42.11%", signature, signingAddress("main"))).toBe(false);
    const flipped = `${signature.slice(0, 10)}${signature[10] === "0" ? "1" : "0"}${signature.slice(11)}`;
    expect(verifyMessage("gain +42.10%", flipped, signingAddress("main"))).toBe(false);
  });

  it.each(["", "0x12", `0x${"00".repeat(64)}1d`, `0x${"zz".repeat(65)}`])(
    "rejects the malformed signature %j",
    (signature) => {
      expect(recoverSigner("m", signature)).toBeUndefined();
    },
  );
});
