import type { Collectible, Collection } from "../../data/collectibles";

export type SpamSignal = "unverified" | "unsolicited" | "mass-airdrop" | "link" | "impersonation";

export interface SpamReason {
  readonly signal: SpamSignal;
  readonly message: string;
  /** Strong signals mark spam on their own; weak ones need company. */
  readonly strong: boolean;
}

const MASS_AIRDROP = 100_000;
// A bare domain ("usdg-bonus.example") or any URL.
const LINK = /\bhttps?:\/\/|\b[a-z0-9-]+\.(?:example|xyz|io|com|net|org|app|gift|claim)\b/i;

/**
 * Why a collectible looks like spam, from what a wallet can see: the collection's
 * verification, how the item arrived, how widely it was sent, and its text.
 * `tokenSymbols` are the catalog's symbols, which spam borrows to look official.
 */
export function spamReasons(
  item: Collectible,
  collection: Collection,
  tokenSymbols: readonly string[],
): readonly SpamReason[] {
  if (collection.verified) return [];
  const text = `${item.name} ${item.description}`;
  const reasons: SpamReason[] = [
    { signal: "unverified", message: "The collection isn't verified", strong: false },
  ];
  if (item.acquired === "airdrop") {
    reasons.push({
      signal: "unsolicited",
      message: "It arrived without you asking for it",
      strong: false,
    });
  }
  if (collection.supply >= MASS_AIRDROP) {
    reasons.push({
      signal: "mass-airdrop",
      message: `Sent to over ${new Intl.NumberFormat("en-US").format(MASS_AIRDROP)} wallets`,
      strong: false,
    });
  }
  if (LINK.test(text)) {
    reasons.push({ signal: "link", message: "It asks you to visit a website", strong: true });
  }
  const borrowed = tokenSymbols.find((symbol) => new RegExp(`\\b${symbol}\\b`).test(text));
  if (borrowed !== undefined) {
    reasons.push({
      signal: "impersonation",
      message: `It uses the name of ${borrowed} to look official`,
      strong: true,
    });
  }
  return reasons;
}

/** Spam when one strong signal fires, or at least two weak ones. */
export function isSpam(reasons: readonly SpamReason[]): boolean {
  return reasons.some((r) => r.strong) || reasons.length >= 2;
}
