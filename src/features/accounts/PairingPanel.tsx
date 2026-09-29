import { Check, Usb } from "lucide-react";
import { useEffect, useState } from "react";
import { useProviders } from "../../app/providers-context";
import { hardwareAccount } from "../../data/accounts";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { showToast } from "../../ui/toast";
import { addAccount } from "./accounts-store";
import { setActiveAccount } from "./active-account";

type Step = "searching" | "found" | "confirm" | "mismatch";
const SEARCH_MS = 1500;

/** Simulated hardware pairing: find the device, then have the user match the address it shows. */
export function PairingPanel({
  onDone,
  onCancel,
}: {
  readonly onDone: () => void;
  readonly onCancel: () => void;
}) {
  const { clock, haptics } = useProviders();
  const [step, setStep] = useState<Step>("searching");
  const device = hardwareAccount.device ?? "Ledger";

  useEffect(() => {
    if (step !== "searching") return;
    return clock.schedule(() => {
      setStep("found");
    }, SEARCH_MS);
  }, [step, clock]);

  return (
    <section aria-label="Pair a hardware wallet" className="flex flex-col gap-4">
      {step === "searching" && (
        <p role="status" className="flex items-center gap-2 text-body text-ink-2">
          <Usb {...icon()} className="animate-shimmer" />
          Looking for devices. Unlock your Ledger and open the Ethereum app.
        </p>
      )}
      {step === "found" && (
        <Button
          variant="secondary"
          size="lg"
          block
          icon={<Usb {...icon()} />}
          onClick={() => {
            setStep("confirm");
          }}
        >
          {device}
        </Button>
      )}
      {step === "confirm" && (
        <>
          <p className="text-body text-ink-2">
            Check that your {device} shows exactly this address:
          </p>
          <p
            className="rounded-md bg-surface-2 p-3 font-mono text-footnote break-all"
            data-testid="pairing-address"
          >
            {hardwareAccount.address}
          </p>
          <Button
            size="lg"
            block
            icon={<Check {...icon()} />}
            onClick={() => {
              addAccount(hardwareAccount);
              setActiveAccount(hardwareAccount.id);
              haptics.play("success");
              showToast(`${device} paired`, "success");
              onDone();
            }}
          >
            It matches
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setStep("mismatch");
            }}
          >
            It doesn't match
          </Button>
        </>
      )}
      {step === "mismatch" && (
        <p role="alert" className="rounded-md bg-loss-soft p-3 text-footnote text-loss">
          Don't use this device with this wallet. A different address can mean a tampered
          connection. Unplug it and try again.
        </p>
      )}
      <Button variant="secondary" onClick={onCancel}>
        {step === "mismatch" ? "Close" : "Cancel"}
      </Button>
    </section>
  );
}
