import type { BalanceDelta, TxRequest } from "./chain";

export type RiskId =
  | "insufficient-balance"
  | "unlimited-approval"
  | "known-drainer"
  | "unverified-contract"
  | "first-time-recipient"
  | "phishing-domain";

export interface RiskFinding {
  readonly id: RiskId;
  readonly severity: "info" | "warning" | "danger";
  readonly message: string;
}

export interface SimulationResult {
  /** Every balance change the account would see, fee included. */
  readonly deltas: readonly BalanceDelta[];
  readonly findings: readonly RiskFinding[];
  /** Set when the transaction would revert; signing should be blocked. */
  readonly failure: string | undefined;
}

/** A dry run against current state, before anything is signed. */
export interface Simulation {
  simulate(account: string, request: TxRequest): SimulationResult;
}
