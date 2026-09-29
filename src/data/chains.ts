import type { Chain, ChainId } from "./types";

export const chains: readonly Chain[] = [
  { id: "robinhood", name: "Robinhood Chain", evmId: 4663, gasSymbol: "ETH" },
  { id: "ethereum", name: "Ethereum", evmId: 1, gasSymbol: "ETH" },
  { id: "arbitrum", name: "Arbitrum One", evmId: 42161, gasSymbol: "ETH" },
  { id: "base", name: "Base", evmId: 8453, gasSymbol: "ETH" },
  { id: "solana", name: "Solana", evmId: undefined, gasSymbol: "SOL" },
];

/** A network's display name from its id. */
export const chainName = (id: ChainId): string => chains.find((c) => c.id === id)?.name ?? id;
