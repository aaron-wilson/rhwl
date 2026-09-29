import { canArm, type PriceAlert } from "../../domain/alerts/alert";
import { createStore, useStore } from "../../lib/store";

/** Session state: Reset demo clears every alert. */
export const alertsStore = createStore<readonly PriceAlert[]>([]);
let nextId = 1;

export type AlertProblem = "already-past" | undefined;

/** Adds an armed alert, unless the price is already past the threshold. */
export function addAlert(
  alert: Pick<PriceAlert, "assetId" | "direction" | "thresholdCents">,
  priceCents: bigint,
): AlertProblem {
  if (!canArm(alert.direction, alert.thresholdCents, priceCents)) return "already-past";
  alertsStore.set((list) => [...list, { ...alert, id: nextId++, armed: true, firedAt: undefined }]);
  return undefined;
}

/** Arms a fired alert again, if the price has come back to the other side. */
export function rearmAlert(id: number, priceCents: bigint): AlertProblem {
  const alert = alertsStore.get().find((a) => a.id === id);
  if (alert === undefined || !canArm(alert.direction, alert.thresholdCents, priceCents)) {
    return "already-past";
  }
  alertsStore.set((list) => list.map((a) => (a.id === id ? { ...a, armed: true } : a)));
  return undefined;
}

export function removeAlert(id: number): void {
  alertsStore.set((list) => list.filter((a) => a.id !== id));
}

export function useAlerts(assetId: string): readonly PriceAlert[] {
  return useStore(alertsStore).filter((a) => a.assetId === assetId);
}
