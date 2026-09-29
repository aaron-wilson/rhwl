import { isSettled } from "../../domain/tx/machine";
import type { TxRequest } from "../../ports/chain";
import type { Providers } from "../../ports/providers";
import { policyStore } from "./policy";
import { signerStore, type Signer } from "./signer";
import { txEvents } from "./tx-events";
import { createTx, dispatchTx, findTx, updateTx, type WalletTx } from "./tx-store";

type Deps = Pick<Providers, "clock" | "chain" | "simulation">;

/** Resolves once `until` has passed on the app clock. */
const waitUntil = (clock: Deps["clock"], until: Date) =>
  new Promise<void>((resolve) => {
    clock.schedule(resolve, Math.max(0, until.getTime() - clock.now().getTime()));
  });

/**
 * Takes one request from draft to confirmed or failed: dry run, spending
 * policy, signature, broadcast, confirmation. Balances update optimistically while it is in
 * flight and roll back on failure. Side effects (toasts, haptics) subscribe to
 * `txEvents`. Resolves with the final transaction.
 */
export async function runTransaction(
  deps: Deps,
  account: string,
  request: TxRequest,
  sign: Signer = signerStore.get().sign,
): Promise<WalletTx> {
  const { clock, chain, simulation } = deps;
  const id = createTx(account, request);
  const dryRun = simulation.simulate(account, request);
  const verdict = policyStore.get().check(request, { account, now: clock.now() });
  // A policy block reads like a failed dry run: shown, never signed.
  const result =
    verdict.kind === "block" && dryRun.failure === undefined
      ? { ...dryRun, failure: verdict.reasons.join(" ") }
      : dryRun;
  updateTx(id, (tx) => ({ ...tx, simulation: result }));
  dispatchTx(id, { type: "simulated", blocked: result.failure !== undefined }, clock.now());
  const current = () => findTx(id) ?? Promise.reject(new Error(`Transaction ${id} vanished`));
  if (verdict.kind !== "allow") {
    txEvents.publish({
      type: "held",
      request,
      reasons: verdict.reasons,
      until: verdict.kind === "delay" ? verdict.until : undefined,
    });
  }
  if (result.failure !== undefined) return current();
  if (verdict.kind === "delay") await waitUntil(clock, verdict.until);

  dispatchTx(id, { type: "request_signature" }, clock.now());
  const decision = await sign(request, result, account);
  if (decision === false) {
    dispatchTx(id, { type: "rejected" }, clock.now());
    return current();
  }
  // The signer may have chosen to pay the fee another way; what is signed is what is sent.
  const signed = decision === true ? request : { ...request, fee: decision.fee };
  if (signed !== request) updateTx(id, (tx) => ({ ...tx, request: signed }));
  dispatchTx(id, { type: "signed" }, clock.now());
  txEvents.publish({ type: "signed", request: signed });

  try {
    const recheck = signed === request ? result : simulation.simulate(account, signed);
    if (recheck.failure !== undefined) throw new Error(recheck.failure);
    const hash = await chain.submit(account, signed);
    dispatchTx(id, { type: "accepted", hash }, clock.now());
    const settled = await chain.settle(hash);
    if (settled.status === "confirmed") {
      dispatchTx(id, { type: "confirmed" }, clock.now());
      txEvents.publish({ type: "confirmed", request: signed });
    } else {
      throw new Error(settled.error ?? "The network rejected the transaction");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const tx = findTx(id);
    if (tx !== undefined && !isSettled(tx.machine.state)) {
      dispatchTx(id, { type: "failed", error: message }, clock.now());
    }
    txEvents.publish({ type: "failed", request: signed, error: message });
  }
  return current();
}
