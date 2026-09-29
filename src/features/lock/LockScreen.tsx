import { ScanFace } from "lucide-react";
import { useState } from "react";
import { Mark } from "../../ui/brand/Mark";
import { Button } from "../../ui/Button";
import { icon } from "../../ui/icon";
import { unlock } from "./lock";

/** Shown instead of the whole app while locked, so no balance is on the page. */
export function LockScreen() {
  const [scanning, setScanning] = useState(false);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Mark size={64} />
      <h1 className="text-title1 font-bold">Wallet locked</h1>
      <p className="text-body text-ink-2">Unlock with your passkey to see your balances.</p>
      <div className="relative w-full max-w-phone">
        {scanning && (
          <span
            data-testid="unlock-scan"
            aria-hidden="true"
            className="absolute inset-x-6 -top-2 h-1 animate-passkey-scan rounded-full bg-accent"
            onAnimationEnd={() => {
              setScanning(false);
              unlock();
            }}
          />
        )}
        <Button
          size="lg"
          block
          loading={scanning}
          icon={<ScanFace {...icon()} />}
          onClick={() => {
            setScanning(true);
          }}
        >
          Unlock with passkey
        </Button>
      </div>
    </main>
  );
}
