import { describe, expect, it } from "vitest";
import { checksumStatus, toChecksumAddress } from "./checksum";

// The test vectors published with EIP-55.
const vectors = [
  "0x8617E340B3D01FA5F11F306F4090FD50E238070D",
  "0xde709f2102306220921060314715629080e2fb77",
  "0x27b1fdb04752bbc536007a920d24acb045561c26",
  "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
  "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
  "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
  "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
];

describe("toChecksumAddress", () => {
  it.each(vectors)("%s", (address) => {
    expect(toChecksumAddress(address.toLowerCase())).toBe(address);
  });

  it("refuses anything that is not an address", () => {
    expect(() => toChecksumAddress("0x1234")).toThrow(RangeError);
  });
});

describe("checksumStatus", () => {
  it("accepts a correct mixed-case address", () => {
    expect(checksumStatus("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe("valid");
  });

  it("leaves single-case addresses unchecked", () => {
    expect(checksumStatus("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")).toBe("none");
    expect(checksumStatus("0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED")).toBe("none");
  });

  it("catches one wrong letter case", () => {
    expect(checksumStatus("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD")).toBe("invalid");
  });
});
