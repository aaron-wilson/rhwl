/**
 * A bridge transfer has two legs: the source-chain transaction the user signs,
 * then the relay's delivery on the destination chain.
 */
export type BridgeState = "source_pending" | "relaying" | "arrived" | "failed";

export type BridgeEvent =
  | { readonly type: "source_confirmed" }
  | { readonly type: "delivered" }
  | { readonly type: "failed"; readonly error: string };

export interface BridgeMachine {
  readonly state: BridgeState;
  readonly error: string | undefined;
  /** Which leg failed, when one did. */
  readonly failedLeg: "source" | "relay" | undefined;
}

export class IllegalBridgeTransition extends Error {
  constructor(state: BridgeState, event: BridgeEvent["type"]) {
    super(`Cannot apply "${event}" in bridge state "${state}"`);
    this.name = "IllegalBridgeTransition";
  }
}

const allowed: Readonly<Record<BridgeState, readonly BridgeEvent["type"][]>> = {
  source_pending: ["source_confirmed", "failed"],
  relaying: ["delivered", "failed"],
  arrived: [],
  failed: [],
};

export const initialBridge: BridgeMachine = {
  state: "source_pending",
  error: undefined,
  failedLeg: undefined,
};

export function bridgeTransition(machine: BridgeMachine, event: BridgeEvent): BridgeMachine {
  if (!allowed[machine.state].includes(event.type)) {
    throw new IllegalBridgeTransition(machine.state, event.type);
  }
  switch (event.type) {
    case "source_confirmed":
      return { ...machine, state: "relaying" };
    case "delivered":
      return { ...machine, state: "arrived" };
    case "failed":
      return {
        state: "failed",
        error: event.error,
        failedLeg: machine.state === "source_pending" ? "source" : "relay",
      };
  }
}

export type LegStatus = "done" | "current" | "waiting" | "failed";

/** The two legs for a timeline: done, current, waiting or failed. */
export function bridgeLegs(machine: BridgeMachine): readonly [LegStatus, LegStatus] {
  switch (machine.state) {
    case "source_pending":
      return ["current", "waiting"];
    case "relaying":
      return ["done", "current"];
    case "arrived":
      return ["done", "done"];
    case "failed":
      return machine.failedLeg === "source" ? ["failed", "waiting"] : ["done", "failed"];
  }
}
