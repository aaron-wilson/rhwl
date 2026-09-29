import { assetById } from "../../data/assets";
import { add, amount, sub, type Amount } from "../../domain/money/amount";
import { createStore, useStore } from "../../lib/store";
import type { Providers } from "../../ports/providers";
import { NETWORK_FEE } from "../transactions/actions";
import { runTransaction } from "../transactions/actions";

/** What the rail moves: brokerage cash arrives as USDG; ETH moves as itself. */
export const railAssets = ["rh:USDG", "rh:ETH"] as const;
export type RailAsset = (typeof railAssets)[number];

/** The linked account's deposit address on Robinhood Chain. Fictional. */
export const BROKERAGE_ADDRESS = "0x0dd0a5c2f7e19b3d4a86c05e2b7f913d8c4e6a21";

interface RailState {
  readonly linked: boolean;
  /** Custodial balances held for the user at the brokerage. */
  readonly balances: Readonly<Record<RailAsset, Amount>>;
}

const start: RailState = {
  linked: false,
  balances: {
    "rh:USDG": amount(12_480_550_000n, 6),
    "rh:ETH": amount(500_000_000_000_000_000n, 18),
  },
};

/** The simulated brokerage account. Session state: Reset demo unlinks it. */
export const railStore = createStore<RailState>(start);

export const useRail = () => useStore(railStore);

export function linkAccount(): void {
  railStore.set((state) => ({ ...state, linked: true }));
}

export function unlinkAccount(): void {
  railStore.set((state) => ({ ...state, linked: false }));
}

function adjust(asset: RailAsset, change: (held: Amount) => Amount): void {
  railStore.set((state) => ({
    ...state,
    balances: { ...state.balances, [asset]: change(state.balances[asset]) },
  }));
}

type Deps = Pick<Providers, "clock" | "chain" | "simulation">;

/**
 * Brokerage → wallet. The custodian sends it, so the wallet signs nothing; the
 * brokerage balance is held back at once and returned if delivery fails.
 */
export async function deposit(deps: Deps, account: string, asset: RailAsset, value: Amount) {
  if (value.base > railStore.get().balances[asset].base) return false;
  adjust(asset, (held) => sub(held, value));
  const tx = await runTransaction(
    deps,
    account,
    {
      kind: "receive",
      summary: {
        verb: "Deposited",
        primary: { assetId: asset, quantity: value },
        detail: "from Robinhood",
      },
      deltas: [{ assetId: asset, quantity: value }],
      fee: { assetId: asset, quantity: amount(0n, assetById(asset).decimals) },
    },
    () => Promise.resolve(true),
  );
  const ok = tx.machine.state === "confirmed";
  if (!ok) adjust(asset, (held) => add(held, value));
  return ok;
}

/** Wallet → brokerage. A normal signed send to the account's deposit address. */
export async function withdraw(deps: Deps, account: string, asset: RailAsset, value: Amount) {
  const debit = amount(-value.base, value.decimals);
  const tx = await runTransaction(deps, account, {
    kind: "send",
    summary: {
      verb: "Withdrew",
      primary: { assetId: asset, quantity: debit },
      detail: "to Robinhood",
    },
    deltas: [{ assetId: asset, quantity: debit }],
    fee: NETWORK_FEE,
    to: BROKERAGE_ADDRESS,
  });
  const ok = tx.machine.state === "confirmed";
  if (ok) adjust(asset, (held) => add(held, value));
  return ok;
}
