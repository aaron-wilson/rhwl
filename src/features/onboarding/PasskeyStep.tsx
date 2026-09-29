import { Check, ScanFace } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";

/**
 * A Face ID-style scan. It is an animation only: nothing calls WebAuthn, and the
 * step completes when the scan and the check that follows it have played
 * (instantly with reduced motion).
 */
export function PasskeyStep({ onCreated }: { readonly onCreated: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <section className="flex flex-col items-center gap-6 pt-16 text-center">
      <div
        aria-hidden="true"
        className="relative flex size-24 items-center justify-center rounded-xl border-2 border-accent text-accent"
      >
        {done ? (
          <span
            data-testid="passkey-done"
            className="animate-passkey-done"
            onAnimationEnd={onCreated}
          >
            <Check {...icon("lg")} />
          </span>
        ) : (
          <ScanFace {...icon("lg")} />
        )}
        {scanning && !done && (
          <span
            data-testid="passkey-scan"
            className="absolute inset-x-2 top-2 h-1 animate-passkey-scan rounded-full bg-accent"
            onAnimationEnd={() => {
              setDone(true);
            }}
          />
        )}
      </div>
      <h1 className="text-title1 font-bold">Create your passkey</h1>
      <p className="text-body text-ink-2">
        Your passkey signs every transaction with Face ID or your device PIN. It stays on this
        device, synced by your password manager.
      </p>
      <p role="status" aria-live="polite" className="text-footnote text-ink-3">
        {done ? "Passkey created" : scanning ? "Scanning…" : ""}
      </p>
      <Button
        size="lg"
        block
        loading={scanning && !done}
        onClick={() => {
          setScanning(true);
        }}
      >
        Create passkey
      </Button>
    </section>
  );
}
