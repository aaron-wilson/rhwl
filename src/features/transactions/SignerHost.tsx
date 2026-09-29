import { lazy, Suspense, useEffect } from "react";
import { findAccount } from "../accounts";
import {
  approveEverything,
  approveEveryMessage,
  sheetMessageApprover,
  sheetSigner,
  signerStore,
  useSignRequest,
  type MessageApprover,
  type Signer,
  type SignMode,
} from "./signer";

const SignSheet = lazy(async () => ({ default: (await import("./SignSheet")).SignSheet }));
const MessageSheet = lazy(async () => ({
  default: (await import("./MessageSheet")).MessageSheet,
}));

/** The signing style per account: hardware accounts approve on their device. */
function modeFor(account: string): SignMode {
  const entry = findAccount(account);
  return entry?.kind === "hardware"
    ? { kind: "hardware", device: entry.device ?? "your device" }
    : { kind: "passkey" };
}

const byAccount: Signer = (request, simulation, account) =>
  sheetSigner(modeFor(account))(request, simulation, account);
const messagesByAccount: MessageApprover = (message, account) =>
  sheetMessageApprover(modeFor(account))(message, account);

/**
 * Makes the sign sheet the signer for every transaction and message while the
 * app is mounted. The sheets' code, and the motion library they need, load on
 * first use.
 */
export function SignerHost() {
  const pending = useSignRequest();
  useEffect(() => {
    signerStore.set({ sign: byAccount, approveMessage: messagesByAccount });
    return () => {
      signerStore.set({ sign: approveEverything, approveMessage: approveEveryMessage });
    };
  }, []);
  if (pending === undefined) return null;
  return (
    <Suspense fallback={null}>
      {pending.kind === "tx" ? <SignSheet pending={pending} /> : <MessageSheet pending={pending} />}
    </Suspense>
  );
}
