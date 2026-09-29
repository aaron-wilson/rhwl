import { describe, expect, it } from "vitest";
import { assetById } from "./assets";
import { chains } from "./chains";
import { tokenContracts } from "./contracts";
import { dappByAddress, dapps } from "./dapps";

describe("dApp registry", () => {
  it("has a DEX, a lending market, a launchpad and one unlisted clone", () => {
    expect(dapps.filter((d) => d.listed).map((d) => d.kind)).toEqual([
      "dex",
      "lending",
      "launchpad",
    ]);
    expect(dapps.filter((d) => !d.listed)).toHaveLength(1);
  });

  it("gives every site a unique origin and a known EVM network", () => {
    expect(new Set(dapps.map((d) => d.origin)).size).toBe(dapps.length);
    dapps.forEach((d) => {
      expect(chains.find((c) => c.id === d.chain)?.evmId).toBeDefined();
      expect(d.permissions[0]).toBe("view");
    });
  });

  it.each([
    ["lendwell.fi", "lendwell"],
    ["https://lendwell.fi/markets?x=1", "lendwell"],
    ["  WWW.HoodSwap.app ", "hood-swap"],
    ["hoodswap-app.com", "hood-swap-clone"],
  ])("opens %j as %s", (input, id) => {
    expect(dappByAddress(input)?.id).toBe(id);
  });

  it.each(["", "hoodswap", "evil.example", "lendwell.fi.evil.example"])(
    "finds nothing at %j",
    (input) => {
      expect(dappByAddress(input)).toBeUndefined();
    },
  );
});

describe("token contracts", () => {
  it("name real assets by lowercase address", () => {
    Object.entries(tokenContracts).forEach(([address, assetId]) => {
      expect(address).toMatch(/^0x[0-9a-f]{40}$/);
      expect(assetById(assetId).id).toBe(assetId);
    });
  });
});
