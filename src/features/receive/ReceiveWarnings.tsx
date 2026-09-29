import { TriangleAlert } from "lucide-react";
import type { Chain } from "../../data/types";
import { icon } from "../../ui/icon";

function warningFor(chain: Chain): string {
  if (chain.id === "robinhood") {
    return "Only send assets on Robinhood Chain. This address is the same on Ethereum, Arbitrum and Base, but tokens sent on those networks arrive there, not here.";
  }
  if (chain.id === "solana") {
    return "Only send Solana assets to this address. Anything sent from another network is lost.";
  }
  return `Only send ${chain.name} assets. They arrive on ${chain.name}; bridge them to use them on Robinhood Chain.`;
}

export interface ReceiveWarningsProps {
  readonly chain: Chain;
}

/** Which network this address receives on, and what goes wrong on the others. */
export function ReceiveWarnings({ chain }: ReceiveWarningsProps) {
  return (
    <div role="note" className="flex gap-3 rounded-md bg-warn-soft p-4 text-footnote text-warn">
      <TriangleAlert {...icon()} className="shrink-0" />
      <p>{warningFor(chain)}</p>
    </div>
  );
}
