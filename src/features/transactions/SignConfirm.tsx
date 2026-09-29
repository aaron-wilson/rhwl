import { ScanFace, Usb } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import type { SignMode } from "./signer";

/**
 * The signature itself: a passkey scan, or approval on a hardware device with
 * its screen drawn above. Calls `onApprove` when the scan finishes.
 */
export function SignConfirm({
  mode,
  prompt,
  onApprove,
  onReject,
}: {
  readonly mode: SignMode;
  /** What the device screen asks, e.g. "Approve transaction?". */
  readonly prompt: string;
  readonly onApprove: () => void;
  readonly onReject: () => void;
}) {
  const [scanning, setScanning] = useState(false);
  const hardware = mode.kind === "hardware";
  return (
    <>
      {hardware && (
        <div
          aria-hidden="true"
          className="mx-auto flex h-16 w-48 items-center justify-center rounded-md border-2 border-line-strong bg-ink font-mono text-footnote text-canvas"
        >
          {scanning ? "Signing…" : prompt}
        </div>
      )}
      <div className="relative">
        {scanning && (
          <span
            data-testid="sign-scan"
            aria-hidden="true"
            className="absolute inset-x-6 -top-2 h-1 animate-passkey-scan rounded-full bg-accent"
            onAnimationEnd={onApprove}
          />
        )}
        <Button
          size="lg"
          block
          loading={scanning}
          icon={hardware ? <Usb {...icon()} /> : <ScanFace {...icon()} />}
          onClick={() => {
            setScanning(true);
          }}
        >
          {hardware ? "Approve on device" : "Confirm with passkey"}
        </Button>
      </div>
      {hardware && (
        <Button variant="ghost" onClick={onReject}>
          Reject on device
        </Button>
      )}
    </>
  );
}
