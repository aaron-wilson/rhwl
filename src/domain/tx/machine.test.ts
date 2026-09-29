import { describe, expect, it } from "vitest";
import {
  IllegalTransition,
  initialTx,
  transition,
  type TxEvent,
  type TxMachine,
  type TxState,
} from "./machine";

const at = new Date("2026-09-29T16:00:00Z");
const run = (...events: TxEvent[]): TxMachine =>
  events.reduce((m, e) => transition(m, e, at), initialTx);

const allEvents: readonly TxEvent[] = [
  { type: "simulated", blocked: false },
  { type: "request_signature" },
  { type: "signed" },
  { type: "rejected" },
  { type: "accepted", hash: "0xabc" },
  { type: "confirmed" },
  { type: "failed", error: "boom" },
];

/** A path reaching each state, so every (state, event) pair can be tried. */
const reach: Record<TxState, readonly TxEvent[]> = {
  draft: [],
  simulated: [{ type: "simulated", blocked: false }],
  awaiting_signature: [{ type: "simulated", blocked: false }, { type: "request_signature" }],
  submitted: [
    { type: "simulated", blocked: false },
    { type: "request_signature" },
    { type: "signed" },
  ],
  pending: [
    { type: "simulated", blocked: false },
    { type: "request_signature" },
    { type: "signed" },
    { type: "accepted", hash: "0x1" },
  ],
  confirmed: [
    { type: "simulated", blocked: false },
    { type: "request_signature" },
    { type: "signed" },
    { type: "accepted", hash: "0x1" },
    { type: "confirmed" },
  ],
  failed: [
    { type: "simulated", blocked: false },
    { type: "request_signature" },
    { type: "signed" },
    { type: "failed", error: "x" },
  ],
};

const states: readonly TxState[] = [
  "draft",
  "simulated",
  "awaiting_signature",
  "submitted",
  "pending",
  "confirmed",
  "failed",
];

const legal: Record<TxState, readonly TxEvent["type"][]> = {
  draft: ["simulated"],
  simulated: ["simulated", "request_signature"],
  awaiting_signature: ["signed", "rejected"],
  submitted: ["accepted", "failed"],
  pending: ["confirmed", "failed"],
  confirmed: [],
  failed: [],
};

describe("transaction state machine", () => {
  it("walks the happy path and records every event", () => {
    const m = run(...reach.confirmed);
    expect(m.state).toBe("confirmed");
    expect(m.hash).toBe("0x1");
    expect(m.log.map((l) => l.event)).toEqual([
      "simulated",
      "request_signature",
      "signed",
      "accepted",
      "confirmed",
    ]);
  });

  it("returns to review when the user rejects the signature", () => {
    expect(run(...reach.awaiting_signature, { type: "rejected" }).state).toBe("simulated");
  });

  it("keeps the failure reason", () => {
    expect(run(...reach.pending, { type: "failed", error: "Insufficient USDG" }).error).toBe(
      "Insufficient USDG",
    );
  });

  it("refuses to ask for a signature when simulation blocked it", () => {
    expect(() => run({ type: "simulated", blocked: true }, { type: "request_signature" })).toThrow(
      IllegalTransition,
    );
  });

  const pairs = states.flatMap((state) =>
    allEvents.map(
      (event) => [state, event.type, legal[state].includes(event.type), event] as const,
    ),
  );

  it.each(pairs)("%s + %s → legal: %s", (state, _type, isLegal, event) => {
    const from = run(...reach[state]);
    expect(from.state).toBe(state);
    if (isLegal) {
      expect(() => transition(from, event, at)).not.toThrow();
    } else {
      expect(() => transition(from, event, at)).toThrow(IllegalTransition);
    }
  });
});
