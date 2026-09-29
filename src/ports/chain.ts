import type { Amount } from "../domain/money/amount";

/** A signed change to one asset balance. Negative leaves the account, positive arrives. */
export interface BalanceDelta {
  readonly assetId: string;
  readonly quantity: Amount;
}

export interface Holding {
  readonly assetId: string;
  readonly quantity: Amount;
}

export type TxKind = "send" | "receive" | "swap" | "approve" | "bridge" | "trade" | "contract";

/**
 * How a transaction is named. Amounts stay data so privacy mode can hide them;
 * `verb` and `detail` must never contain an amount.
 */
export interface TxSummary {
  /** The action: "Send", "Bought", "Bridged". */
  readonly verb: string;
  /** The amount worth naming, shown through privacy masking. */
  readonly primary?: BalanceDelta;
  /** Words after the amount: "from Base", "to you.rh". */
  readonly detail?: string;
}

/** What the wallet asks the chain to do, already reduced to its effects. */
export interface TxRequest {
  readonly kind: TxKind;
  readonly summary: TxSummary;
  readonly deltas: readonly BalanceDelta[];
  readonly fee: BalanceDelta;
  /** The site that asked for this transaction, when a site did. */
  readonly requestedBy?: string;
  /** Counterparty address or contract, when there is one. */
  readonly to?: string;
  /** For approvals: the allowance granted, or "unlimited". */
  readonly allowance?: Amount | "unlimited";
  /** Collectibles leaving the account. The ledger tracks tokens only; the wallet tracks these. */
  readonly collectibles?: readonly CollectibleOut[];
  /**
   * For an atomic batch: each leg as the user would read it. `deltas` holds
   * their merged effect, and the chain applies all of it or none.
   */
  readonly legs?: readonly TxLeg[];
  /** For a leveraged position being opened: its leverage, which guardrails can cap. */
  readonly leverage?: number;
  /** For a sale or a close: the profit (positive) or loss it locks in, in cents. */
  readonly realizedCents?: bigint;
}

export interface TxLeg {
  readonly summary: TxSummary;
  readonly deltas: readonly BalanceDelta[];
}

export interface CollectibleOut {
  readonly id: string;
  readonly name: string;
}

export interface ChainTx {
  readonly hash: string;
  readonly nonce: number;
  readonly request: TxRequest;
  readonly status: "pending" | "confirmed" | "failed";
  readonly submittedAt: Date;
  readonly settledAt: Date | undefined;
  readonly error: string | undefined;
}

/** The ledger: balances, nonces and history for the wallet's accounts. */
export interface Chain {
  balances(account: string): readonly Holding[];
  nonce(account: string): number;
  history(account: string): readonly ChainTx[];
  /** Broadcasts a request; resolves with the hash once the network has accepted it. */
  submit(account: string, request: TxRequest): Promise<string>;
  /** Resolves when the transaction confirms or fails. */
  settle(hash: string): Promise<ChainTx>;
  /** Called after any balance or history change. */
  subscribe(listener: () => void): () => void;
}
