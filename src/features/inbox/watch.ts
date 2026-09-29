import { assetById } from "../../data/assets";
import { checkAlerts } from "../../domain/alerts/alert";
import { earningsNight } from "../../domain/earnings/earnings";
import { amount, valueInCents } from "../../domain/money/amount";
import { formatFiat } from "../../domain/money/format";
import { marketState } from "../../domain/market/hours";
import type { Providers } from "../../ports/providers";
import { activeAccountStore } from "../accounts";
import { agentStore } from "../agent";
import { alertsStore } from "../alerts";
import { assetPath } from "../asset";
import { bridgeStore } from "../bridge";
import { calendarFor } from "../../domain/earnings/held";
import { txEvents } from "../transactions";
import { notify } from "./inbox-store";

const HOUR = 3_600_000;

/** The next regular open strictly after `now`; during a session that is tomorrow's, not today's. */
export function nextOpenAfter(now: Date): Date {
  let at = now;
  for (;;) {
    const opens = marketState(at).nextOpen;
    if (opens.getTime() > now.getTime()) return opens;
    at = new Date(at.getTime() + 6 * HOUR);
  }
}
const outcomeTitle = {
  done: "Your agent acted",
  skipped: "Your agent skipped a run",
  held: "Your agent was held by a guardrail",
  failed: "Your agent's run failed",
} as const;

/**
 * Fills the inbox while the app runs: fills and swaps as they confirm, bridge
 * arrivals, agent outcomes, the market opening, and a reminder an hour before
 * the close on the day a held stock reports. Returns a stop function.
 */
export function startInbox(providers: Providers): () => void {
  const { clock, chain, market } = providers;
  const stops: (() => void)[] = [];

  stops.push(
    txEvents.subscribe((event) => {
      const { kind, summary } = event.request;
      if (event.type !== "confirmed" || (kind !== "trade" && kind !== "swap")) return;
      notify({ kind: "fill", at: clock.now(), summary, title: "Order filled", to: "/activity" });
    }),
  );

  let arrived = new Set(
    bridgeStore
      .get()
      .filter((j) => j.machine.state === "arrived")
      .map((j) => j.id),
  );
  stops.push(
    bridgeStore.subscribe(() => {
      for (const job of bridgeStore.get()) {
        if (job.machine.state !== "arrived" || arrived.has(job.id)) continue;
        arrived = new Set([...arrived, job.id]);
        notify({
          kind: "bridge",
          at: clock.now(),
          title: "Bridge complete",
          detail: `Arrived: ${assetById(job.toAsset).symbol}`,
          to: "/bridge",
        });
      }
    }),
  );

  let seen = new Set(agentStore.get().feed.map((f) => f.id));
  stops.push(
    agentStore.subscribe(() => {
      for (const entry of agentStore.get().feed) {
        if (seen.has(entry.id)) continue;
        seen = new Set([...seen, entry.id]);
        notify({
          kind: "agent",
          at: entry.at,
          summary: entry.summary,
          title: outcomeTitle[entry.outcome],
          detail: entry.note,
          to: "/agent",
        });
      }
    }),
  );

  const armOpen = () => {
    const opens = nextOpenAfter(clock.now());
    stops.push(
      clock.schedule(
        () => {
          notify({
            kind: "market",
            at: clock.now(),
            title: "The market is open",
            detail: "Stock Tokens track the listing again",
            to: "/trade",
          });
          armOpen();
        },
        Math.max(0, opens.getTime() - clock.now().getTime()),
      ),
    );
  };
  armOpen();

  // Price alerts, checked every 5 s of app time; each fires once until re-armed.
  let cancelAlerts: () => void = () => undefined;
  const checkPrices = () => {
    const now = clock.now();
    const cents = (id: string) => valueInCents(amount(1n, 0), market.price(id, now));
    const { alerts, fired } = checkAlerts(alertsStore.get(), cents, now);
    if (fired.length > 0) alertsStore.set(alerts);
    for (const alert of fired) {
      const asset = assetById(alert.assetId);
      const moved = alert.direction === "above" ? "rose above" : "fell below";
      notify({
        kind: "alert",
        at: now,
        title: `${asset.symbol} ${moved} ${formatFiat(alert.thresholdCents)}`,
        detail: "Re-arm it on the asset page",
        to: assetPath(asset),
      });
    }
    cancelAlerts = clock.schedule(checkPrices, 5_000);
  };
  checkPrices();
  stops.push(() => {
    cancelAlerts();
  });

  const holdings = chain.balances(activeAccountStore.get());
  for (const entry of calendarFor(holdings, clock.now())) {
    const remindAt = earningsNight(entry.date).start.getTime() - HOUR;
    if (remindAt < clock.now().getTime()) continue;
    const symbol = assetById(entry.assetId).symbol;
    stops.push(
      clock.schedule(() => {
        notify({
          kind: "earnings",
          at: clock.now(),
          title: `${symbol} reports after the close today`,
          detail: "Everything riding on it is on its earnings night page",
          to: `/earnings/${entry.assetId.replace(":", "-")}`,
        });
      }, remindAt - clock.now().getTime()),
    );
  }

  return () => {
    stops.forEach((stop) => {
      stop();
    });
  };
}
