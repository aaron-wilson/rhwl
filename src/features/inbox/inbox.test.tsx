import { render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { assetById } from "../../data/assets";
import { earningsNight } from "../../domain/earnings/earnings";
import { marketState } from "../../domain/market/hours";
import { amount } from "../../domain/money/amount";
import { testProviders } from "../../test/providers";
import { agentStore } from "../agent";
import { bridgeStore, type BridgeJob } from "../bridge";
import { calendarFor } from "../../domain/earnings/held";
import { txEvents } from "../transactions";
import { InboxBell } from "./InboxBell";
import { InboxPage } from "./InboxPage";
import { inboxStore, notify } from "./inbox-store";
import { nextOpenAfter, startInbox } from "./watch";

const fee = { assetId: "rh:ETH", quantity: amount(0n, 18) };
let stop: () => void = () => undefined;

afterEach(() => {
  stop();
});

describe("inbox watcher", () => {
  it("adds a fill when a trade confirms, and ignores other kinds", () => {
    const p = testProviders();
    stop = startInbox(p);
    const summary = { verb: "Bought", detail: "NVDA" };
    txEvents.publish({ type: "confirmed", request: { kind: "trade", summary, deltas: [], fee } });
    txEvents.publish({ type: "confirmed", request: { kind: "send", summary, deltas: [], fee } });
    expect(inboxStore.get()).toMatchObject([{ kind: "fill", title: "Order filled", summary }]);
  });

  it("adds a bridge arrival once, and each new agent outcome", () => {
    const p = testProviders();
    stop = startInbox(p);
    const usdg = amount(1_000_000n, 6);
    const job: BridgeJob = {
      id: 7,
      account: "main",
      fromChain: "solana",
      toChain: "robinhood",
      fromAsset: "sol:SOL",
      toAsset: "rh:USDG",
      amountIn: usdg,
      route: { id: "fast", name: "Relay", feeCents: 0n, seconds: 20, out: usdg, refuel: undefined },
      machine: { state: "arrived", error: undefined, failedLeg: undefined },
      arrivesAt: p.clock.now(),
    };
    bridgeStore.set([job]);
    bridgeStore.set([job]);
    agentStore.set((s) => ({
      ...s,
      feed: [
        {
          id: 99,
          keyId: 1,
          at: p.clock.now(),
          outcome: "held",
          summary: undefined,
          note: "Over budget",
        },
      ],
    }));
    expect(inboxStore.get().map((i) => `${i.kind}: ${i.title}`)).toEqual([
      "agent: Your agent was held by a guardrail",
      "bridge: Bridge complete",
    ]);
  });

  it("announces the market open on the app clock, and the next one after it", () => {
    const p = testProviders();
    stop = startInbox(p);
    const opens = nextOpenAfter(p.clock.now());
    p.clock.advance(opens.getTime() - p.clock.now().getTime() - 1);
    expect(inboxStore.get()).toEqual([]);
    p.clock.advance(1);
    expect(inboxStore.get()).toMatchObject([{ kind: "market", title: "The market is open" }]);
    p.clock.advance(24 * 3_600_000);
    expect(inboxStore.get().filter((i) => i.kind === "market")).toHaveLength(2);
  });

  it("reminds an hour before the close on the day a held stock reports", () => {
    const p = testProviders();
    stop = startInbox(p);
    const first = calendarFor(p.chain.balances("main"), p.clock.now())[0];
    if (first === undefined) throw new Error("no earnings in the calendar");
    const remindAt = earningsNight(first.date).start.getTime() - 3_600_000;
    p.clock.advance(remindAt - p.clock.now().getTime());
    const symbol = assetById(first.assetId).symbol;
    expect(inboxStore.get().find((i) => i.kind === "earnings")?.title).toBe(
      `${symbol} reports after the close today`,
    );
  });
});

describe("nextOpenAfter", () => {
  it("skips today's open once the session has begun", () => {
    const during = new Date("2026-09-29T16:00:00Z");
    expect(marketState(during).session).toBe("open");
    expect(nextOpenAfter(during).toISOString()).toBe("2026-09-30T13:30:00.000Z");
    const atOpen = new Date("2026-09-30T13:30:00Z");
    expect(nextOpenAfter(atOpen).toISOString()).toBe("2026-10-01T13:30:00.000Z");
  });
});

describe("inbox page and bell", () => {
  it("shows the unread count, lists items and marks them read", () => {
    const p = testProviders();
    notify({ kind: "market", at: p.clock.now(), title: "The market is open", to: "/trade" });
    notify({
      kind: "fill",
      at: p.clock.now(),
      title: "Order filled",
      summary: { verb: "Bought", detail: "NVDA" },
    });
    const router = createMemoryRouter(
      [
        { path: "/", Component: InboxBell },
        { path: "/inbox", Component: InboxPage },
      ],
      { initialEntries: ["/"] },
    );
    render(
      <ProvidersContext.Provider value={p}>
        <RouterProvider router={router} />
      </ProvidersContext.Provider>,
    );
    expect(screen.getByRole("link", { name: "Inbox, 2 unread" })).toBeInTheDocument();
    void router.navigate("/inbox");
    return screen.findByRole("list", { name: "Notifications" }).then((list) => {
      expect(within(list).getAllByRole("listitem")).toHaveLength(2);
      expect(list).toHaveTextContent("Bought NVDA");
      return waitFor(() => {
        expect(inboxStore.get().every((i) => i.read)).toBe(true);
      });
    });
  });
});
