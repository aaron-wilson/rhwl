/** Rules for a `.rh` name: the part before the suffix, as typed. */
export const NAME_SUFFIX = ".rh";
const MIN = 3;
const MAX = 20;

/** Names nobody can claim, because they would impersonate the platform. */
const reserved = new Set([
  "robinhood",
  "hood",
  "admin",
  "support",
  "wallet",
  "official",
  "security",
]);

export type NameCheck =
  { readonly ok: true; readonly name: string } | { readonly ok: false; readonly reason: string };

/** Normalizes and validates a typed name. "  Diamond-Hands.rh " → "diamond-hands". */
export function checkName(input: string): NameCheck {
  const name = input.trim().toLowerCase().replace(/\.rh$/, "");
  if (name.length < MIN) return { ok: false, reason: `Use at least ${MIN} characters` };
  if (name.length > MAX) return { ok: false, reason: `Use at most ${MAX} characters` };
  if (!/^[a-z0-9-]+$/.test(name))
    return { ok: false, reason: "Use letters, numbers and hyphens only" };
  if (name.startsWith("-") || name.endsWith("-"))
    return { ok: false, reason: "Can't start or end with a hyphen" };
  if (name.includes("--")) return { ok: false, reason: "Can't have two hyphens in a row" };
  if (reserved.has(name)) return { ok: false, reason: "That name is reserved" };
  return { ok: true, name };
}

/** Names the demo world treats as already claimed. */
export const takenNames: ReadonlySet<string> = new Set([
  "you",
  "satoshi",
  "vitalik",
  "degen",
  "tendies",
  "diamondhands",
  "stonks",
  "yolo",
  "wsb",
]);
