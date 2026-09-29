import { UNVERIFIED_CONTRACT } from "./contracts";
import type { ChainId } from "./types";

/** A token allowance an account has granted: who may spend it, how much, since when. */
export interface Approval {
  readonly id: string;
  readonly account: string;
  readonly chain: ChainId;
  readonly assetId: string;
  readonly spender: string;
  /** A readable name for the spender, when it is a known site. */
  readonly spenderName: string | undefined;
  /** Base units of the token, or "unlimited". */
  readonly allowance: bigint | "unlimited";
  readonly grantedAt: Date;
}

const ROUTER = "0x1111000000000000000000000000000000000001";
const PERPS = "0x2222000000000000000000000000000000000002";
const DRAINER = "0xdead0000000000000000000000000000000beef1";
const OLD_BRIDGE = "0x4e1d000000000000000000000000000000000b1d";

/** The approvals the demo wallet starts with, across four networks, from harmless to dangerous. */
export const startingApprovals: readonly Approval[] = [
  {
    id: "a1",
    account: "main",
    chain: "robinhood",
    assetId: "rh:USDG",
    spender: ROUTER,
    spenderName: "Hood Swap",
    allowance: 250_000_000n,
    grantedAt: new Date("2026-09-12T10:00:00Z"),
  },
  {
    id: "a2",
    account: "main",
    chain: "robinhood",
    assetId: "rh:USDG",
    spender: PERPS,
    spenderName: "Perps",
    allowance: "unlimited",
    grantedAt: new Date("2026-08-30T15:00:00Z"),
  },
  {
    id: "a3",
    account: "main",
    chain: "arbitrum",
    assetId: "rh:USDC",
    spender: DRAINER,
    spenderName: undefined,
    allowance: "unlimited",
    grantedAt: new Date("2026-09-25T21:40:00Z"),
  },
  {
    id: "a4",
    account: "main",
    chain: "base",
    assetId: "rh:ETH",
    spender: UNVERIFIED_CONTRACT,
    spenderName: undefined,
    allowance: 500_000_000_000_000_000n,
    grantedAt: new Date("2026-09-20T09:00:00Z"),
  },
  {
    id: "a5",
    account: "main",
    chain: "ethereum",
    assetId: "rh:USDC",
    spender: OLD_BRIDGE,
    spenderName: undefined,
    allowance: "unlimited",
    grantedAt: new Date("2025-11-02T12:00:00Z"),
  },
  {
    id: "a6",
    account: "degen",
    chain: "robinhood",
    assetId: "rh:USDG",
    spender: ROUTER,
    spenderName: "Hood Swap",
    allowance: "unlimited",
    grantedAt: new Date("2026-09-01T12:00:00Z"),
  },
];
