/** When an agent rule runs. Times are fixed at 15:00 UTC, mid-session in New York. */
export type Cadence =
  | { readonly kind: "daily" }
  | { readonly kind: "weekly"; readonly weekday: number }
  | { readonly kind: "monthly" };

/** What must hold at run time for a conditional buy to go ahead. */
export type Condition =
  | { readonly kind: "below-average"; readonly days: number }
  | { readonly kind: "below-price"; readonly priceCents: bigint }
  | { readonly kind: "down-today"; readonly bps: bigint };

/** A compiled rule: everything the agent may do, and nothing else. */
export type AgentRule =
  | {
      readonly intent: "buy";
      readonly assetId: string;
      readonly amountCents: bigint;
      readonly cadence: Cadence;
      readonly condition: Condition | undefined;
      /** Most the agent may spend under this rule, in total. */
      readonly capCents: bigint;
      readonly expiresAt: Date;
    }
  | {
      readonly intent: "take-profit";
      readonly assetId: string;
      /** Share of the holding to sell, in percent. */
      readonly sellPercent: number;
      /** Gain over average cost that triggers it, in basis points. */
      readonly gainBps: bigint;
      readonly expiresAt: Date;
    }
  | {
      readonly intent: "rebalance";
      readonly cadence: Cadence;
      readonly expiresAt: Date;
    };

export type ParseResult =
  | { readonly ok: true; readonly rule: AgentRule }
  | { readonly ok: false; readonly reason: string; readonly example: string };
