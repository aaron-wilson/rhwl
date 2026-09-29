import { describe, expect, it } from "vitest";
import { chains } from "../../data/chains";
import type { Chain } from "../../data/types";
import { addressUri, requestAmount, requestLink } from "./links";

const chain = (id: Chain["id"]): Chain => {
  const found = chains.find((c) => c.id === id);
  if (found === undefined) throw new Error(id);
  return found;
};
const evm = "0x8f3a41c2b7d9e05a6c1f48b3e2d7a90c5b61c21e";

describe("addressUri", () => {
  it("pins EVM addresses to their chain id", () => {
    expect(addressUri(chain("robinhood"), evm)).toBe(`ethereum:${evm}@4663`);
    expect(addressUri(chain("base"), evm)).toBe(`ethereum:${evm}@8453`);
  });

  it("uses Solana Pay for Solana", () => {
    expect(addressUri(chain("solana"), "7Hq3uW")).toBe("solana:7Hq3uW");
  });
});

describe("requestLink", () => {
  it("opens Send with the recipient, chain, asset and amount filled in", () => {
    const link = requestLink("https://wallet.example", {
      to: evm,
      chain: "robinhood",
      assetId: "rh:USDG",
      amount: "25",
    });
    expect(link).toBe(
      `https://wallet.example/send?to=${evm}&chain=robinhood&asset=rh%3AUSDG&amount=25`,
    );
    const params = new URL(link).searchParams;
    expect(params.get("asset")).toBe("rh:USDG");
  });
});

describe("requestAmount", () => {
  it.each([
    ["25", 6, "25"],
    [" 0.50 ", 6, "0.5"],
    ["1,000", 6, "1000"],
    ["0.000001", 6, "0.000001"],
    ["0.0000001", 6, undefined],
    ["0", 6, undefined],
    ["-3", 6, undefined],
    ["abc", 6, undefined],
    ["", 6, undefined],
  ] as const)("%j with %d decimals → %s", (text, decimals, expected) => {
    expect(requestAmount(text, decimals)).toBe(expected);
  });
});
