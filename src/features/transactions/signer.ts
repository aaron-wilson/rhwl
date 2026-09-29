import { createStore, useStore } from "../../lib/store";
import type { BalanceDelta, TxRequest } from "../../ports/chain";
import type { RiskFinding, SimulationResult } from "../../ports/simulation";

/**
 * The user's answer: refuse, approve as asked, or approve paying the fee
 * another way (another token, another speed, or sponsored).
 */
export type SignDecision = boolean | { readonly fee: BalanceDelta };

/** Approves or refuses a transaction after the user has seen what it will do. */
export type Signer = (
  request: TxRequest,
  simulation: SimulationResult,
  account: string,
) => Promise<SignDecision>;

/** A message to sign: `payload` is signed exactly; `display` is what the user reads. */
export interface MessageRequest {
  readonly payload: string;
  readonly display: string;
  /** The site asking, when a site asks. */
  readonly origin?: string;
  /** What the risk checks flagged about this message. */
  readonly findings?: readonly RiskFinding[];
}

/** Approves or refuses signing a message. No simulation: a message moves no funds. */
export type MessageApprover = (message: MessageRequest, account: string) => Promise<boolean>;

/** Used where no signing UI is mounted: unit tests and scripts. */
export const approveEverything: Signer = () => Promise.resolve(true);
export const approveEveryMessage: MessageApprover = () => Promise.resolve(true);

/**
 * The signers every transaction and message use. The app mounts the passkey sheet
 * and swaps them in. Wrapped in an object because a store treats a bare function
 * as an updater.
 */
export const signerStore = createStore<{
  readonly sign: Signer;
  readonly approveMessage: MessageApprover;
}>({ sign: approveEverything, approveMessage: approveEveryMessage }, "app");

/** How the signature is given: a passkey scan here, or approval on a hardware device. */
export type SignMode =
  { readonly kind: "passkey" } | { readonly kind: "hardware"; readonly device: string };

export interface TxSignRequest {
  readonly kind: "tx";
  readonly mode: SignMode;
  readonly account: string;
  readonly request: TxRequest;
  readonly simulation: SimulationResult;
  readonly resolve: (decision: SignDecision) => void;
}

export interface MessageSignRequest {
  readonly kind: "message";
  readonly mode: SignMode;
  readonly account: string;
  readonly message: MessageRequest;
  readonly resolve: (approved: boolean) => void;
}

export type SignRequest = TxSignRequest | MessageSignRequest;

/** The request waiting for the sign sheet, if any. */
export const signRequestStore = createStore<SignRequest | undefined>(undefined);

/** Opens the sign sheet in the given mode and waits for the user's answer. */
export const sheetSigner =
  (mode: SignMode): Signer =>
  (request, simulation, account) =>
    new Promise((resolve) => {
      signRequestStore.set({
        kind: "tx",
        mode,
        account,
        request,
        simulation,
        resolve: (decision) => {
          signRequestStore.set(undefined);
          resolve(decision);
        },
      });
    });

/** Opens the sign sheet for a message in the given mode and waits for the answer. */
export const sheetMessageApprover =
  (mode: SignMode): MessageApprover =>
  (message, account) =>
    new Promise((resolve) => {
      signRequestStore.set({
        kind: "message",
        mode,
        account,
        message,
        resolve: (approved) => {
          signRequestStore.set(undefined);
          resolve(approved);
        },
      });
    });

export const useSignRequest = () => useStore(signRequestStore);
