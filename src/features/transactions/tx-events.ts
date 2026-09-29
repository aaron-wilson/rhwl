import { createChannel } from "../../lib/channel";
import type { TxRequest } from "../../ports/chain";

/** What the transaction service announces. Toasts, haptics and the inbox subscribe. */
export type TxEvent =
  | { readonly type: "signed"; readonly request: TxRequest }
  | { readonly type: "confirmed"; readonly request: TxRequest }
  | { readonly type: "failed"; readonly request: TxRequest; readonly error: string }
  /** The spending policy stopped or delayed it before the signature. */
  | {
      readonly type: "held";
      readonly request: TxRequest;
      readonly reasons: readonly string[];
      readonly until: Date | undefined;
    };

export const txEvents = createChannel<TxEvent>();
