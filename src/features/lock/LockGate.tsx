import { useEffect, type ReactNode } from "react";
import { useProviders } from "../../app/providers-context";
import { signRequestStore } from "../transactions";
import { startAutoLock, useLocked } from "./lock";
import { LockScreen } from "./LockScreen";

/** Runs the auto-lock and replaces the whole app with the lock screen while locked. */
export function LockGate({ children }: { readonly children: ReactNode }) {
  const { clock, visibility } = useProviders();
  const locked = useLocked();
  useEffect(() => startAutoLock(clock, visibility, window), [clock, visibility]);
  // Locking mid-signature refuses the signature rather than leaving it hanging.
  useEffect(() => {
    if (locked) signRequestStore.get()?.resolve(false);
  }, [locked]);
  return locked ? <LockScreen /> : <>{children}</>;
}
