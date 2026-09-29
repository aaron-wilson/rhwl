/** Perpetual futures the demo lists, margined and settled in USDG. Funding in 0.01 bps per 8 hours. */
export interface PerpMarket {
  readonly id: string;
  readonly assetId: string;
  readonly maxLeverage: number;
  readonly fundingCentiBps: number;
}

export const perpMarkets: readonly PerpMarket[] = [
  { id: "ETH-PERP", assetId: "rh:ETH", maxLeverage: 20, fundingCentiBps: 100 },
  { id: "BTC-PERP", assetId: "rh:WBTC", maxLeverage: 20, fundingCentiBps: 80 },
  { id: "NVDA-PERP", assetId: "rh:NVDA", maxLeverage: 10, fundingCentiBps: 120 },
  { id: "TSLA-PERP", assetId: "rh:TSLA", maxLeverage: 10, fundingCentiBps: 150 },
  { id: "SPY-PERP", assetId: "rh:SPY", maxLeverage: 10, fundingCentiBps: 60 },
];

export function perpMarketById(id: string): PerpMarket | undefined {
  return perpMarkets.find((m) => m.id === id);
}

/** The demo's perps exchange contract; it is on the simulation's verified list. */
export const PERPS_CONTRACT = "0x2222000000000000000000000000000000000002";
