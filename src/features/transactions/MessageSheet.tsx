import { Sheet } from "../../ui/Sheet";
import { findAccount } from "../accounts";
import type { MessageSignRequest } from "./signer";
import { Findings } from "./Findings";
import { SignConfirm } from "./SignConfirm";

/**
 * The sign moment for a message: who signs, and exactly what they are signing.
 * No dry run and no fee, because a signed message moves nothing.
 */
export function MessageSheet({ pending }: { readonly pending: MessageSignRequest }) {
  const { message, mode, account, resolve } = pending;
  const hardware = mode.kind === "hardware";
  const name = findAccount(account)?.name ?? account;
  return (
    <Sheet
      open
      onClose={() => {
        resolve(false);
      }}
      title={hardware ? "Confirm on device" : "Sign message"}
      description={
        hardware
          ? `Review and approve on your ${mode.device}`
          : `Signing as ${name}. This moves no funds.`
      }
    >
      <div className="flex flex-col gap-4">
        {message.origin !== undefined && (
          <p className="text-footnote text-ink-2">Requested by {message.origin}</p>
        )}
        <pre
          aria-label="Message"
          className="max-h-64 overflow-auto rounded-md bg-surface-2 p-3 font-mono text-footnote whitespace-pre-wrap text-ink"
        >
          {message.display}
        </pre>
        <Findings findings={message.findings ?? []} />
        <SignConfirm
          mode={mode}
          prompt="Sign message?"
          onApprove={() => {
            resolve(true);
          }}
          onReject={() => {
            resolve(false);
          }}
        />
      </div>
    </Sheet>
  );
}
