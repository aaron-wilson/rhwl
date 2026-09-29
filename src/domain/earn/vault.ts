import { amount, type Amount } from "../money/amount";

/** The demo vault's rate: 7% a year, compounding continuously in time. */
export const VAULT_APY = 0.07;
const YEAR_MS = 365 * 24 * 3_600_000;
/** Growth factors carry 12 decimals: exact enough for cents on any balance here. */
const SCALE = 1_000_000_000_000n;

/** What `principal` grows to after `ms` at the vault's APY: principal × (1 + APY)^(t / year). */
export function grow(principal: Amount, ms: number, apy = VAULT_APY): Amount {
  if (ms <= 0) return principal;
  const factor = BigInt(Math.round(Math.pow(1 + apy, ms / YEAR_MS) * Number(SCALE)));
  return amount((principal.base * factor) / SCALE, principal.decimals);
}

export interface VaultPosition {
  /** Balance at `since`, interest earlier than that already added in. */
  readonly principal: Amount;
  readonly since: Date;
  /** Everything deposited, less everything withdrawn, for "earned so far". */
  readonly netDeposited: Amount;
}

export const emptyVault = (decimals: number, at: Date): VaultPosition => ({
  principal: amount(0n, decimals),
  since: at,
  netDeposited: amount(0n, decimals),
});

export function vaultBalance(position: VaultPosition, now: Date): Amount {
  return grow(position.principal, now.getTime() - position.since.getTime());
}

/** Interest earned to date: balance less what went in. */
export function vaultEarned(position: VaultPosition, now: Date): Amount {
  const balance = vaultBalance(position, now);
  return amount(balance.base - position.netDeposited.base, balance.decimals);
}

/** Adds (positive) or removes (negative) funds at `now`, compounding what accrued first. */
export function vaultMove(position: VaultPosition, change: Amount, now: Date): VaultPosition {
  const balance = vaultBalance(position, now);
  return {
    principal: amount(balance.base + change.base, balance.decimals),
    since: now,
    netDeposited: amount(position.netDeposited.base + change.base, balance.decimals),
  };
}
