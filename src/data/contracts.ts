/** Fictional token contracts on Robinhood Chain, so request decoders can name what a call touches. */
export const tokenContracts: Readonly<Record<string, string>> = {
  "0x5d6e000000000000000000000000000000000a01": "rh:USDG",
  "0x5d6e000000000000000000000000000000000a02": "rh:USDC",
  "0x5d6e000000000000000000000000000000000a03": "rh:NVDA",
  "0x5d6e000000000000000000000000000000000a04": "rh:TSLA",
};

/** A launchpad token contract nobody has verified: the unverified-contract finding's example. */
export const UNVERIFIED_CONTRACT = "0x7a11000000000000000000000000000000000f0e";
