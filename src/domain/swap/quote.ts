import type { Route } from "./routes";

/** A quote is good for this long; after that it must be refreshed before signing. */
export const QUOTE_TTL_MS = 15_000;
/** How long the demo aggregator takes to answer. */
export const QUOTE_LATENCY_MS = 400;

export type QuoteState =
  | { readonly status: "idle" }
  | { readonly status: "quoting" }
  | {
      readonly status: "fresh" | "stale";
      readonly routes: readonly Route[];
      readonly quotedAt: Date;
    };

export type QuoteEvent =
  | { readonly type: "request" }
  | { readonly type: "receive"; readonly routes: readonly Route[]; readonly at: Date }
  | { readonly type: "expire" }
  | { readonly type: "clear" };

/** The quote's lifecycle. Only a fresh quote can be signed. */
export function quoteReducer(state: QuoteState, event: QuoteEvent): QuoteState {
  switch (event.type) {
    case "request":
      return { status: "quoting" };
    case "receive":
      return state.status === "quoting"
        ? { status: "fresh", routes: event.routes, quotedAt: event.at }
        : state;
    case "expire":
      return state.status === "fresh" ? { ...state, status: "stale" } : state;
    case "clear":
      return { status: "idle" };
  }
}

/** Share of the quote's life left at `now`, from 1 to 0, for the refresh ring. */
export function quoteLife(quotedAt: Date, now: Date): number {
  const left = 1 - (now.getTime() - quotedAt.getTime()) / QUOTE_TTL_MS;
  return Math.min(1, Math.max(0, left));
}
