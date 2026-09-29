import type { CorporateAction, StockToken } from "./types";

const launch: CorporateAction = { date: "2026-07-01", kind: "launch", multiplier: "1" };

function stock(
  symbol: string,
  name: string,
  fields: Pick<StockToken, "exchange" | "sector" | "nextEarnings" | "anchorUsd" | "splash">,
  actions: readonly CorporateAction[] = [],
): StockToken {
  return {
    id: `rh:${symbol}`,
    symbol,
    name,
    chain: "robinhood",
    decimals: 18,
    kind: "stock",
    ...fields,
    actions: [launch, ...actions],
  };
}

/** The fake world's assets. Tickers are real equities; every meme and launchpad is fictional. */

/** Stock Tokens. Tickers are real equities; prices and actions are simulated. */
export const stockTokens: readonly StockToken[] = [
  stock(
    "NVDA",
    "NVIDIA",
    {
      exchange: "NASDAQ",
      sector: "Semiconductors",
      nextEarnings: "2026-11-18",
      anchorUsd: "186.84",
      splash: "violet",
    },
    [{ date: "2026-09-05", kind: "dividend", multiplier: "1.000054" }],
  ),
  stock(
    "AAPL",
    "Apple",
    {
      exchange: "NASDAQ",
      sector: "Consumer tech",
      nextEarnings: "2026-10-29",
      anchorUsd: "251.40",
      splash: "sky",
    },
    [{ date: "2026-08-14", kind: "dividend", multiplier: "1.001034" }],
  ),
  stock(
    "TSLA",
    "Tesla",
    {
      exchange: "NASDAQ",
      sector: "Autos",
      nextEarnings: "2026-10-21",
      anchorUsd: "412.30",
      splash: "orange",
    },
    [{ date: "2026-08-25", kind: "split", multiplier: "3" }],
  ),
  stock(
    "MSFT",
    "Microsoft",
    {
      exchange: "NASDAQ",
      sector: "Software",
      nextEarnings: "2026-10-27",
      anchorUsd: "522.15",
      splash: "blue",
    },
    [{ date: "2026-08-20", kind: "dividend", multiplier: "1.001592" }],
  ),
  stock("GOOGL", "Alphabet", {
    exchange: "NASDAQ",
    sector: "Internet",
    nextEarnings: "2026-10-28",
    anchorUsd: "247.90",
    splash: "lime",
  }),
  stock("AMZN", "Amazon", {
    exchange: "NASDAQ",
    sector: "Internet",
    nextEarnings: "2026-10-29",
    anchorUsd: "229.60",
    splash: "amber",
  }),
  stock("META", "Meta Platforms", {
    exchange: "NASDAQ",
    sector: "Internet",
    nextEarnings: "2026-10-28",
    anchorUsd: "758.20",
    splash: "blue",
  }),
  stock("HOOD", "Robinhood Markets", {
    exchange: "NASDAQ",
    sector: "Finance",
    nextEarnings: "2026-10-28",
    anchorUsd: "138.45",
    splash: "lime",
  }),
  stock("MU", "Micron", {
    exchange: "NASDAQ",
    sector: "Semiconductors",
    nextEarnings: "2026-12-17",
    anchorUsd: "164.10",
    splash: "violet",
  }),
  stock("COIN", "Coinbase", {
    exchange: "NASDAQ",
    sector: "Finance",
    nextEarnings: "2026-10-29",
    anchorUsd: "341.75",
    splash: "blue",
  }),
  stock(
    "SPY",
    "S&P 500 ETF",
    {
      exchange: "NYSE Arca",
      sector: "Index fund",
      nextEarnings: "2026-12-18",
      anchorUsd: "671.05",
      splash: "blue",
    },
    [{ date: "2026-09-19", kind: "dividend", multiplier: "1.002611" }],
  ),
  stock(
    "QQQ",
    "Nasdaq-100 ETF",
    {
      exchange: "NASDAQ",
      sector: "Index fund",
      nextEarnings: "2026-12-21",
      anchorUsd: "598.30",
      splash: "sky",
    },
    [{ date: "2026-09-21", kind: "dividend", multiplier: "1.001241" }],
  ),
];
