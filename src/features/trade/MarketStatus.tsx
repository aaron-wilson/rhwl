import { useNow } from "../../app/useNow";
import { marketState } from "../../domain/market/hours";
import { Badge } from "../../ui/Badge";

const label = {
  open: "NYSE open",
  pre: "Pre-market",
  after: "After hours",
  closed: "NYSE closed",
} as const;

/** Live exchange status. Stock Tokens trade on-chain regardless; this says what the listing does. */
export function MarketStatus() {
  const { session } = marketState(useNow());
  return (
    <Badge tone={session === "open" ? "gain" : session === "closed" ? "warn" : "live"}>
      {label[session]}
    </Badge>
  );
}
