import { describe, expect, it } from "vitest";
import { assets } from "../../data/assets";
import {
  collectionById,
  genesisCollectibles,
  type Collectible,
  type Collection,
} from "../../data/collectibles";
import { isSpam, spamReasons } from "./spam";

const symbols = assets.map((a) => a.symbol);
const base: Collection = {
  id: "c",
  name: "Test",
  contract: "0x0000000000000000000000000000000000000001",
  verified: false,
  supply: 100,
  floorEth: undefined,
  description: "",
  palette: ["sky", "pink"],
};
const item = (overrides: Partial<Collectible> = {}): Collectible => ({
  id: "c-1",
  collectionId: "c",
  tokenId: "1",
  name: "Test #1",
  owner: "main",
  acquired: "bought",
  description: "A plain item.",
  traits: [],
  ...overrides,
});
const signals = (i: Collectible, c: Collection = base) =>
  spamReasons(i, c, symbols).map((r) => r.signal);

describe("spamReasons", () => {
  it("trusts verified collections whatever they say", () => {
    expect(signals(item({ name: "Visit claim.xyz" }), { ...base, verified: true })).toEqual([]);
  });

  it.each([
    ["an unverified item bought on purpose", item(), ["unverified"], false],
    ["an unverified airdrop", item({ acquired: "airdrop" }), ["unverified", "unsolicited"], true],
    ["a link in the name", item({ name: "Go to rewards.example" }), ["unverified", "link"], true],
    [
      "a link in the description",
      item({ description: "See https://x.test" }),
      ["unverified", "link"],
      true,
    ],
    [
      "a borrowed token name",
      item({ name: "Official ETH Pass" }),
      ["unverified", "impersonation"],
      true,
    ],
    ["a symbol inside another word", item({ name: "Methodical" }), ["unverified"], false],
  ] as const)("%s", (_, collectible, expected, spam) => {
    expect(signals(collectible)).toEqual(expected);
    expect(isSpam(spamReasons(collectible, base, symbols))).toBe(spam);
  });

  it("flags collections sent to over 100,000 wallets", () => {
    expect(signals(item(), { ...base, supply: 100_000 })).toEqual(["unverified", "mass-airdrop"]);
  });

  it("classifies the demo's genesis collectibles", () => {
    const spam = genesisCollectibles
      .filter((c) => isSpam(spamReasons(c, collectionById(c.collectionId), symbols)))
      .map((c) => c.id);
    expect(spam).toEqual(["usdg-voucher-1", "free-mint-pass-99102", "free-mint-pass-44310"]);
  });
});
