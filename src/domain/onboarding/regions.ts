/** Countries offered at sign-up. US persons cannot hold Stock Tokens. */
export const regions = [
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "SG", name: "Singapore" },
  { code: "US", name: "United States" },
] as const;

export const stockTokensAllowed = (code: string) => code !== "US";
