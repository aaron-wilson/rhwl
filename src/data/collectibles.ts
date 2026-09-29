import type { SplashName } from "../tokens/color";

/** Every collection, contract and site here is fictional. */
export interface Collection {
  readonly id: string;
  readonly name: string;
  readonly contract: string;
  readonly verified: boolean;
  readonly supply: number;
  /** Lowest listed price in ETH, as decimal text; undefined when nothing trades. */
  readonly floorEth: string | undefined;
  readonly description: string;
  /** Two content colors the generated art is drawn from. */
  readonly palette: readonly [SplashName, SplashName];
}

export interface Trait {
  readonly type: string;
  readonly value: string;
  /** Share of the collection with this trait, in basis points. */
  readonly rarityBps: number;
}

export interface Collectible {
  readonly id: string;
  readonly collectionId: string;
  readonly tokenId: string;
  readonly name: string;
  readonly owner: string;
  /** How it arrived: bought or minted by the owner, or sent unasked. */
  readonly acquired: "bought" | "minted" | "airdrop";
  readonly description: string;
  readonly traits: readonly Trait[];
}

export const collections: readonly Collection[] = [
  {
    id: "chainlets",
    name: "Chainlets",
    contract: "0x3333000000000000000000000000000000000003",
    verified: true,
    supply: 10_000,
    floorEth: "0.18",
    description: "Ten thousand little blocks, each one different, minted on launch day.",
    palette: ["sky", "violet"],
  },
  {
    id: "stonk-seals",
    name: "Stonk Seals",
    contract: "0x4444000000000000000000000000000000000004",
    verified: true,
    supply: 5_000,
    floorEth: "0.042",
    description: "Seals of approval for every ticker. Holders get a badge in ticker rooms.",
    palette: ["teal", "blue"],
  },
  {
    id: "degen-diplomas",
    name: "Degen Diplomas",
    contract: "0x5555000000000000000000000000000000000005",
    verified: true,
    supply: 2_500,
    floorEth: "0.009",
    description: "Awarded for surviving a meme season. Framing not included.",
    palette: ["amber", "pink"],
  },
  {
    id: "usdg-voucher",
    name: "USDG Reward Voucher",
    contract: "0x6666000000000000000000000000000000000006",
    verified: false,
    supply: 480_000,
    floorEth: undefined,
    description: "Claim your 5,000 USDG reward at usdg-bonus.example before it expires!",
    palette: ["teal", "lime"],
  },
  {
    id: "free-mint-pass",
    name: "Free Mint Pass",
    contract: "0x7777000000000000000000000000000000000007",
    verified: false,
    supply: 250_000,
    floorEth: undefined,
    description: "You have been selected. Connect your wallet to mint.",
    palette: ["orange", "amber"],
  },
];

const trait = (type: string, value: string, rarityBps: number): Trait => ({
  type,
  value,
  rarityBps,
});

function item(
  collectionId: string,
  tokenId: string,
  owner: string,
  acquired: Collectible["acquired"],
  traits: readonly Trait[],
  name?: string,
): Collectible {
  const collection = collectionById(collectionId);
  return {
    id: `${collectionId}-${tokenId}`,
    collectionId,
    tokenId,
    name: name ?? `${collection.name} #${tokenId}`,
    owner,
    acquired,
    description: collection.description,
    traits,
  };
}

const byId = new Map(collections.map((c) => [c.id, c]));

export function collectionById(id: string): Collection {
  const collection = byId.get(id);
  if (collection === undefined) throw new Error(`Unknown collection ${id}`);
  return collection;
}

/** What each account holds at the start of the demo. */
export const genesisCollectibles: readonly Collectible[] = [
  item("chainlets", "412", "main", "minted", [
    trait("Background", "Aurora", 400),
    trait("Shape", "Stacked", 1_800),
    trait("Glow", "Ultraviolet", 150),
  ]),
  item("chainlets", "1877", "main", "bought", [
    trait("Background", "Dusk", 2_200),
    trait("Shape", "Twin", 900),
    trait("Glow", "None", 5_100),
  ]),
  item("stonk-seals", "88", "main", "minted", [
    trait("Ticker", "NVDA", 600),
    trait("Mood", "Bullish", 3_000),
    trait("Hat", "Visor", 700),
  ]),
  item("stonk-seals", "3021", "main", "bought", [
    trait("Ticker", "SPY", 1_100),
    trait("Mood", "Diamond hands", 450),
    trait("Hat", "None", 4_200),
  ]),
  item("degen-diplomas", "7", "main", "minted", [
    trait("Season", "Summer '26", 2_000),
    trait("Honors", "Summa cum rug", 120),
  ]),
  item(
    "usdg-voucher",
    "1",
    "main",
    "airdrop",
    [trait("Reward", "5,000 USDG", 10_000)],
    "Claim 5,000 USDG at usdg-bonus.example",
  ),
  item("free-mint-pass", "99102", "main", "airdrop", [trait("Tier", "Selected", 10_000)]),
  item("degen-diplomas", "1203", "degen", "minted", [
    trait("Season", "Spring '26", 2_400),
    trait("Honors", "Paper hands", 3_100),
  ]),
  item("degen-diplomas", "2210", "degen", "bought", [
    trait("Season", "Summer '26", 2_000),
    trait("Honors", "Diamond hands", 800),
  ]),
  item("free-mint-pass", "44310", "degen", "airdrop", [trait("Tier", "Selected", 10_000)]),
  item("chainlets", "5", "ledger", "minted", [
    trait("Background", "Genesis", 10),
    trait("Shape", "Single", 3_000),
    trait("Glow", "Gold", 60),
  ]),
];
