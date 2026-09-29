/** A price alert: fires once when the price crosses the threshold, then waits to be re-armed. */
export interface PriceAlert {
  readonly id: number;
  readonly assetId: string;
  readonly direction: "above" | "below";
  readonly thresholdCents: bigint;
  readonly armed: boolean;
  /** When it last fired; undefined until it has. */
  readonly firedAt: Date | undefined;
}

/** Whether the price is past the threshold in the alert's direction. */
export function crossed(
  direction: PriceAlert["direction"],
  thresholdCents: bigint,
  priceCents: bigint,
): boolean {
  return direction === "above" ? priceCents >= thresholdCents : priceCents <= thresholdCents;
}

/** An alert can only be armed while the price is on the other side, or it would fire at once. */
export function canArm(
  direction: PriceAlert["direction"],
  thresholdCents: bigint,
  priceCents: bigint,
): boolean {
  return thresholdCents > 0n && !crossed(direction, thresholdCents, priceCents);
}

/**
 * Checks every armed alert against its asset's price. Those that crossed fire
 * once: they are returned in `fired` and come back disarmed. Nothing else changes.
 */
export function checkAlerts(
  alerts: readonly PriceAlert[],
  priceCents: (assetId: string) => bigint,
  now: Date,
): { readonly alerts: readonly PriceAlert[]; readonly fired: readonly PriceAlert[] } {
  const fired: PriceAlert[] = [];
  const next = alerts.map((alert) => {
    if (
      !alert.armed ||
      !crossed(alert.direction, alert.thresholdCents, priceCents(alert.assetId))
    ) {
      return alert;
    }
    const done = { ...alert, armed: false, firedAt: now };
    fired.push(done);
    return done;
  });
  return { alerts: fired.length === 0 ? alerts : next, fired };
}
