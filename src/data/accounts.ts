import type { Holding } from "../ports/chain";
import { parseAmount } from "../domain/money/amount";
import { collections } from "./collectibles";
import { VAULT_CONTRACT } from "./earn";
import { assetById } from "./assets";

export type AccountKind = "passkey" | "hardware" | "watch";

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly kind: AccountKind;
  /** EVM address, shared by Robinhood Chain, Ethereum, Arbitrum and Base. */
  readonly address: string;
  readonly solanaAddress: string | undefined;
  /** The paired device, for hardware accounts. */
  readonly device: string | undefined;
}

export const accounts: readonly Account[] = [
  {
    id: "main",
    name: "you.rh",
    kind: "passkey",
    address: "0x8f3a41c2b7d9e05a6f1c3b2d4e8a9f07c6b5c21e",
    solanaAddress: "7Hq3uWzv9KpX4mN2dRe8sTyB5cLgA1fJoV6iQkZ3wYxP",
    device: undefined,
  },
  {
    id: "degen",
    name: "Degen",
    kind: "passkey",
    address: "0x44b1d09c7e3fa2b6581c0d4e9f7a3b2c16d59e0d",
    solanaAddress: undefined,
    device: undefined,
  },
];

/** The account a hardware pairing creates. Its balances are in genesis under the same id. */
export const hardwareAccount: Account = {
  id: "ledger",
  name: "Ledger",
  kind: "hardware",
  address: "0xa91c04f2d7b38e6c5f01d9a2b4c7e8f3d6a0b15c",
  solanaAddress: undefined,
  device: "Ledger Nano X",
};

function holding(assetId: string, text: string): Holding {
  const { decimals } = assetById(assetId);
  const quantity = parseAmount(text, decimals);
  if (quantity === undefined) throw new Error(`Bad genesis amount ${text} for ${assetId}`);
  return { assetId, quantity };
}

/** Balances each account starts the demo with. */
export const genesis: Readonly<Record<string, readonly Holding[]>> = {
  main: [
    holding("rh:ETH", "1.2044"),
    holding("rh:USDG", "8120"),
    holding("rh:NVDA", "12.408"),
    holding("rh:AAPL", "20.5"),
    holding("rh:TSLA", "9.75"),
    holding("rh:SPY", "14.1"),
    holding("rh:CHIPDOG", "2400000"),
    holding("rh:BASKET", "750000"),
    holding("sol:SOL", "18.42"),
  ],
  degen: [
    holding("rh:ETH", "0.31"),
    holding("rh:TENDIES", "9800000"),
    holding("rh:ROBOTAXI", "4100000"),
  ],
  ledger: [holding("rh:ETH", "0.8"), holding("rh:USDG", "2500"), holding("rh:SPY", "3")],
};

/** Addresses the risk engine knows. Fictional; any resemblance to a real address is chance. */
export const knownAddresses = {
  drainers: new Set(["0xdead0000000000000000000000000000000beef1"]),
  verifiedContracts: new Set([
    "0x1111000000000000000000000000000000000001",
    "0x2222000000000000000000000000000000000002",
    ...collections.filter((c) => c.verified).map((c) => c.contract),
    VAULT_CONTRACT,
  ]),
} as const;
