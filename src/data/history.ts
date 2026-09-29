import { parseAmount, type Amount } from "../domain/money/amount";
import type { TxRequest } from "../ports/chain";
import { assetById } from "./assets";

const q = (assetId: string, text: string): Amount => {
  const value = parseAmount(text, assetById(assetId).decimals);
  if (value === undefined) throw new Error(`Bad history amount ${text}`);
  return value;
};
const fee = { assetId: "rh:ETH", quantity: q("rh:ETH", "-0.000004") };

export interface PastTx {
  readonly account: string;
  readonly at: string;
  readonly request: TxRequest;
}

/** Confirmed transactions from before the demo starts. Genesis balances already include them. */
export const pastTransactions: readonly PastTx[] = [
  {
    account: "main",
    at: "2026-09-22T15:20:00Z",
    request: {
      kind: "send",
      summary: {
        verb: "Sent",
        primary: { assetId: "rh:USDG", quantity: q("rh:USDG", "-150") },
        detail: "to stonks.rh",
      },
      deltas: [{ assetId: "rh:USDG", quantity: q("rh:USDG", "-150") }],
      fee,
      to: "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3f19",
    },
  },
  {
    // Address poisoning: a zero-value transfer from a lookalike of stonks.rh,
    // planted so the lookalike shows up in history to be copied by mistake.
    account: "main",
    at: "2026-09-23T02:47:00Z",
    request: {
      kind: "receive",
      summary: {
        verb: "Received",
        primary: { assetId: "rh:USDG", quantity: q("rh:USDG", "0") },
        detail: "from 0x7a2c…3f19",
      },
      deltas: [{ assetId: "rh:USDG", quantity: q("rh:USDG", "0") }],
      fee: { assetId: "rh:ETH", quantity: q("rh:ETH", "0") },
      to: "0x7a2c5b0e8d1f4a9c6e2b7d03f5a8c1e9b4d23f19",
    },
  },
  {
    account: "main",
    at: "2026-09-24T18:12:00Z",
    request: {
      kind: "bridge",
      summary: {
        verb: "Bridged",
        primary: { assetId: "rh:ETH", quantity: q("rh:ETH", "0.25") },
        detail: "from Base",
      },
      deltas: [{ assetId: "rh:ETH", quantity: q("rh:ETH", "0.25") }],
      fee,
    },
  },
  {
    account: "main",
    at: "2026-09-25T14:03:00Z",
    request: {
      kind: "receive",
      summary: { verb: "Received", primary: { assetId: "rh:USDG", quantity: q("rh:USDG", "500") } },
      deltas: [{ assetId: "rh:USDG", quantity: q("rh:USDG", "500") }],
      fee: { assetId: "rh:ETH", quantity: q("rh:ETH", "0") },
      to: "0x7a2c000000000000000000000000000000003f19",
    },
  },
  {
    account: "main",
    at: "2026-09-25T19:41:00Z",
    request: {
      kind: "trade",
      summary: {
        verb: "Bought",
        primary: { assetId: "rh:NVDA", quantity: q("rh:NVDA", "2.6771") },
      },
      deltas: [
        { assetId: "rh:USDG", quantity: q("rh:USDG", "-500") },
        { assetId: "rh:NVDA", quantity: q("rh:NVDA", "2.6771") },
      ],
      fee,
    },
  },
];
