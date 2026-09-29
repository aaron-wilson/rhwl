import { createStore, useStore } from "../../lib/store";
import type { Clock } from "../../ports/clock";
import type { Visibility } from "../../ports/visibility";

export const autoLockOptions = [
  { value: "60000", label: "1 min" },
  { value: "300000", label: "5 min" },
  { value: "never", label: "Never" },
] as const;
export type AutoLock = (typeof autoLockOptions)[number]["value"];

/** Whether the wallet is locked. Session state: a reload or Reset demo unlocks. */
export const lockedStore = createStore(false);
/** How long the app may sit idle, or in the background, before it locks. */
export const autoLockStore = createStore<AutoLock>("300000", "preference");

export const lockNow = () => {
  lockedStore.set(true);
};
export const unlock = () => {
  lockedStore.set(false);
};
export const useLocked = () => useStore(lockedStore);
export const useAutoLock = () => useStore(autoLockStore);

const timeoutMs = () => {
  const value = autoLockStore.get();
  return value === "never" ? undefined : Number(value);
};

/**
 * Locks after the chosen time without a tap or key press, and on return from the
 * background if the app was away at least that long. Both measured on the app clock.
 */
export function startAutoLock(
  clock: Clock,
  visibility: Visibility,
  activity: EventTarget,
): () => void {
  let cancel: () => void = () => {
    // Nothing scheduled yet.
  };
  let hiddenAt: number | undefined;

  const arm = () => {
    cancel();
    const ms = timeoutMs();
    if (ms !== undefined && !lockedStore.get()) cancel = clock.schedule(lockNow, ms);
  };
  const onActivity = () => {
    arm();
  };
  const offVisibility = visibility.subscribe((visible) => {
    if (!visible) {
      hiddenAt = clock.now().getTime();
      return;
    }
    const ms = timeoutMs();
    if (hiddenAt !== undefined && ms !== undefined && clock.now().getTime() - hiddenAt >= ms)
      lockNow();
    hiddenAt = undefined;
    arm();
  });
  const offSettings = autoLockStore.subscribe(arm);
  const offLock = lockedStore.subscribe(arm);
  activity.addEventListener("pointerdown", onActivity);
  activity.addEventListener("keydown", onActivity);
  arm();
  return () => {
    cancel();
    offVisibility();
    offSettings();
    offLock();
    activity.removeEventListener("pointerdown", onActivity);
    activity.removeEventListener("keydown", onActivity);
  };
}
