import { describe, expect, it } from "vitest";
import { parseCustomNetwork } from "./custom";

const good = {
  name: " My testnet ",
  rpcUrl: "https://rpc.example.org/v1",
  chainId: "12345",
  symbol: "TST",
};

describe("custom network form", () => {
  it("accepts a well-formed network, trimmed", () => {
    expect(parseCustomNetwork(good, [1])).toEqual({
      network: {
        name: "My testnet",
        rpcUrl: "https://rpc.example.org/v1",
        chainId: 12345,
        symbol: "TST",
      },
    });
  });

  it.each([
    ["name", { name: "  " }, "Give the network a name"],
    ["name", { name: "x".repeat(33) }, "Keep the name under 33 characters"],
    ["rpcUrl", { rpcUrl: "http://rpc.example.org" }, "Use an https:// address with a domain"],
    ["rpcUrl", { rpcUrl: "https://localhost" }, "Use an https:// address with a domain"],
    ["chainId", { chainId: "0" }, "Chain ID is a whole number above zero"],
    ["chainId", { chainId: "12a" }, "Chain ID is a whole number above zero"],
    ["symbol", { symbol: "eth" }, "Symbol is 2 to 6 capital letters"],
  ])("explains a bad %s", (field, change, message) => {
    const result = parseCustomNetwork({ ...good, ...change }, []);
    expect(result).toEqual({ errors: { [field]: message } });
  });

  it("refuses a chain ID already in use", () => {
    expect(parseCustomNetwork({ ...good, chainId: "4663" }, [4663])).toEqual({
      errors: { chainId: "Chain ID 4663 is already in use" },
    });
  });
});
