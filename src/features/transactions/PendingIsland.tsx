import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { isInFlight, isSettled, type TxState } from "../../domain/tx/machine";
import { cx } from "../../ui/cx";
import { icon } from "../../ui/icon";
import { useBalancesHidden } from "../privacy";
import { txTitleText } from "./tx-title";
import { TxTitle } from "./TxTitle";
import { useTxs, type WalletTx } from "./tx-store";

const LINGER_MS = 4000;

const status: Partial<Record<TxState, string>> = {
  submitted: "Broadcasting",
  pending: "Confirming",
  confirmed: "Confirmed",
  failed: "Failed",
};

function steps(tx: WalletTx) {
  const seen = new Set(tx.machine.log.map((entry) => entry.event));
  const failed = tx.machine.state === "failed";
  return [
    { label: "Simulated", done: seen.has("simulated") },
    { label: "Signed", done: seen.has("signed") },
    { label: "Broadcast", done: seen.has("accepted") },
    { label: failed ? "Failed" : "Confirmed", done: seen.has("confirmed") || failed },
  ];
}

/**
 * The live transaction pill. It follows the user across screens while anything
 * is in flight, lingers briefly on the result, and expands into a step timeline.
 * The third and last blurred surface.
 */
export function PendingIsland() {
  const txs = useTxs();
  const { clock } = useProviders();
  const [open, setOpen] = useState(false);
  const hidden = useBalancesHidden();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const inFlight = txs.find((candidate) => isInFlight(candidate.machine.state));
  const settled = txs.find((candidate) => isSettled(candidate.machine.state));
  const lingerEnd =
    inFlight === undefined && settled !== undefined
      ? (settled.machine.log.at(-1)?.at.getTime() ?? 0) + LINGER_MS
      : undefined;

  // One timer for the moment the result should disappear; nothing ticks while idle.
  useEffect(() => {
    if (lingerEnd === undefined) return;
    const remaining = lingerEnd - clock.now().getTime();
    return remaining > 0 ? clock.schedule(rerender, remaining) : undefined;
  }, [lingerEnd, clock]);

  const lingering = lingerEnd !== undefined && clock.now().getTime() < lingerEnd;
  const tx = inFlight ?? (lingering ? settled : undefined);
  const text = tx === undefined ? undefined : status[tx.machine.state];

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {tx !== undefined && text !== undefined
          ? `${txTitleText(tx.request.summary, { hidden })}: ${text}`
          : ""}
      </p>
      {tx !== undefined && text !== undefined && (
        <div className="fixed inset-x-0 bottom-24 layer-island flex justify-center px-4 lg:inset-x-auto lg:top-4 lg:right-4 lg:bottom-auto">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => {
              setOpen((was) => !was);
            }}
            className={cx(
              "flex animate-toast-in flex-col gap-3 border border-line bg-chrome px-4 py-2 text-left shadow-md backdrop-blur-chrome",
              open ? "rounded-lg" : "rounded-full",
            )}
          >
            <span className="flex items-center gap-2 text-body font-semibold">
              {isInFlight(tx.machine.state) ? (
                <LoaderCircle {...icon()} className="animate-spin text-live" />
              ) : tx.machine.state === "failed" ? (
                <CircleAlert {...icon()} className="text-loss" />
              ) : (
                <Check {...icon()} className="text-gain" />
              )}
              <span>
                <TxTitle summary={tx.request.summary} />
              </span>
              <span className="text-footnote font-regular text-ink-3">{text}</span>
            </span>
            {open && (
              <ol className="flex flex-col gap-1 pb-1 text-footnote">
                {steps(tx).map((step) => (
                  <li
                    key={step.label}
                    className={cx("flex items-center gap-2", step.done ? "text-ink" : "text-ink-3")}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "size-2 rounded-full",
                        step.done
                          ? step.label === "Failed"
                            ? "bg-loss"
                            : "bg-gain"
                          : "bg-line-strong",
                      )}
                    />
                    {step.label}
                    <span className="sr-only">{step.done ? "done" : "waiting"}</span>
                  </li>
                ))}
              </ol>
            )}
          </button>
        </div>
      )}
    </>
  );
}
