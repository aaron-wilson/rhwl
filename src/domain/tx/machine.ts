/**
 * The life of one wallet transaction. Components and services dispatch events;
 * only this reducer decides the next state.
 */
export type TxState =
  "draft" | "simulated" | "awaiting_signature" | "submitted" | "pending" | "confirmed" | "failed";

export type TxEvent =
  | { readonly type: "simulated"; readonly blocked: boolean }
  | { readonly type: "request_signature" }
  | { readonly type: "signed" }
  | { readonly type: "rejected" }
  | { readonly type: "accepted"; readonly hash: string }
  | { readonly type: "confirmed" }
  | { readonly type: "failed"; readonly error: string };

export interface TxMachine {
  readonly state: TxState;
  readonly blocked: boolean;
  readonly hash: string | undefined;
  readonly error: string | undefined;
  readonly log: readonly { readonly event: TxEvent["type"]; readonly at: Date }[];
}

export class IllegalTransition extends Error {
  constructor(state: TxState, event: TxEvent["type"]) {
    super(`Cannot apply "${event}" in state "${state}"`);
    this.name = "IllegalTransition";
  }
}

/** Which events each state accepts. Anything else is a bug and throws. */
const allowed: Readonly<Record<TxState, readonly TxEvent["type"][]>> = {
  draft: ["simulated"],
  simulated: ["simulated", "request_signature"],
  awaiting_signature: ["signed", "rejected"],
  submitted: ["accepted", "failed"],
  pending: ["confirmed", "failed"],
  confirmed: [],
  failed: [],
};

export const initialTx: TxMachine = {
  state: "draft",
  blocked: false,
  hash: undefined,
  error: undefined,
  log: [],
};

export const isInFlight = (state: TxState) => state === "submitted" || state === "pending";
export const isSettled = (state: TxState) => state === "confirmed" || state === "failed";

export function transition(machine: TxMachine, event: TxEvent, at: Date): TxMachine {
  if (!allowed[machine.state].includes(event.type))
    throw new IllegalTransition(machine.state, event.type);
  const log = [...machine.log, { event: event.type, at }];
  switch (event.type) {
    case "simulated":
      return { ...machine, state: "simulated", blocked: event.blocked, log };
    case "request_signature":
      if (machine.blocked) throw new IllegalTransition(machine.state, event.type);
      return { ...machine, state: "awaiting_signature", log };
    case "signed":
      return { ...machine, state: "submitted", log };
    case "rejected":
      return { ...machine, state: "simulated", log };
    case "accepted":
      return { ...machine, state: "pending", hash: event.hash, log };
    case "confirmed":
      return { ...machine, state: "confirmed", log };
    case "failed":
      return { ...machine, state: "failed", error: event.error, log };
  }
}
