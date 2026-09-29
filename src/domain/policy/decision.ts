import type { TxRequest } from "../../ports/chain";

/** What a spending policy says about a transaction before it is signed. */
export type PolicyDecision =
  | { readonly kind: "allow" }
  | { readonly kind: "block"; readonly reasons: readonly string[] }
  | { readonly kind: "delay"; readonly until: Date; readonly reasons: readonly string[] };

export interface PolicyContext {
  readonly account: string;
  readonly now: Date;
}

/** A pure check run on every transaction, after the dry run and before the signature. */
export type Policy = (request: TxRequest, context: PolicyContext) => PolicyDecision;

export const ALLOW: PolicyDecision = { kind: "allow" };
export const allowAll: Policy = () => ALLOW;
