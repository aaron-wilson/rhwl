import { knownAddresses } from "../../data/accounts";
import type { RiskFinding } from "../../ports/simulation";
import type { Intent } from "./intent";

const HOMOGLYPHS: readonly (readonly [RegExp, string])[] = [
  [/0/g, "o"],
  [/1/g, "l"],
  [/rn/g, "m"],
  [/vv/g, "w"],
];
const host = (origin: string) =>
  origin
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
const squash = (text: string) =>
  HOMOGLYPHS.reduce((s, [from, to]) => s.replace(from, to), text).replace(/[^a-z]/g, "");

/**
 * A site that borrows a known site's name without being it: "hoodswap-app.com"
 * or "h00dswap.app" for "hoodswap.app". The name is the known origin's first label.
 */
export function phishingFinding(origin: string, known: readonly string[]): RiskFinding | undefined {
  const site = host(origin);
  if (known.includes(site)) return undefined;
  const lookalike = known.find((k) => {
    const brand = squash(k.split(".")[0] ?? "");
    return brand.length >= 4 && squash(site).includes(brand);
  });
  if (lookalike === undefined) return undefined;
  return {
    id: "phishing-domain",
    severity: "danger",
    message: `${site} is pretending to be ${lookalike}. Nothing you sign here is safe.`,
  };
}

/** Findings a signature carries, which no dry run would show because nothing is sent yet. */
export function signatureFindings(intent: Intent): RiskFinding[] {
  const findings: RiskFinding[] = [];
  if (intent.kind === "permit") {
    if (intent.allowance === "unlimited") {
      findings.push({
        id: "unlimited-approval",
        severity: "warning",
        message: "This signature grants unlimited spending of this token until you revoke it.",
      });
    }
    if (knownAddresses.drainers.has(intent.spender)) {
      findings.push({
        id: "known-drainer",
        severity: "danger",
        message: "The spender has drained other wallets. Do not sign.",
      });
    }
  }
  const contract = intent.kind === "typed" ? intent.contract : undefined;
  if (contract !== undefined && !knownAddresses.verifiedContracts.has(contract)) {
    findings.push({
      id: "unverified-contract",
      severity: "warning",
      message: "The contract this signature is for is not verified.",
    });
  }
  return findings;
}

const rank = { danger: 0, warning: 1, info: 2 } as const;

/** Every finding for a request: the site, the signature, then the dry run; one per kind, worst first. */
export function requestFindings(
  origin: string,
  known: readonly string[],
  intent: Intent,
  simulated: readonly RiskFinding[] = [],
): RiskFinding[] {
  const phishing = phishingFinding(origin, known);
  const all = [
    ...(phishing === undefined ? [] : [phishing]),
    ...signatureFindings(intent),
    ...simulated,
  ];
  const unique = all.filter((f, i) => all.findIndex((g) => g.id === f.id) === i);
  return unique.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
