/** What the security center checks, each worth a share of the 100-point score. */
export type CheckId = "backup" | "signer" | "lock" | "guardrails" | "approvals" | "poison";

/** Plain facts about the active account; the checks are a pure function of them. */
export interface SecurityFacts {
  readonly backupVerified: boolean;
  readonly signer: "passkey" | "hardware" | "watch";
  readonly autoLock: boolean;
  readonly guardrails: boolean;
  readonly riskyApprovals: number;
  readonly unflaggedPoison: number;
}

export interface SecurityCheck {
  readonly id: CheckId;
  readonly title: string;
  readonly done: boolean;
  readonly detail: string;
  readonly weight: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The checklist, in the order it is shown. Weights add up to 100. */
export function securityChecks(f: SecurityFacts): SecurityCheck[] {
  return [
    {
      id: "backup",
      title: "Backup verified",
      weight: 20,
      done: f.backupVerified,
      detail: f.backupVerified
        ? "You proved you can recover this account"
        : "Not checked this session",
    },
    {
      id: "signer",
      title: "Signs with a passkey or device",
      weight: 15,
      done: f.signer !== "watch",
      detail:
        f.signer === "watch" ? "Watch-only: this account cannot sign" : `Signs with a ${f.signer}`,
    },
    {
      id: "lock",
      title: "App lock on",
      weight: 15,
      done: f.autoLock,
      detail: f.autoLock ? "Locks itself when idle" : "Never locks by itself",
    },
    {
      id: "guardrails",
      title: "Guardrails set",
      weight: 15,
      done: f.guardrails,
      detail: f.guardrails ? "Your limits apply to every trade" : "No limits on trades",
    },
    {
      id: "approvals",
      title: "No risky approvals",
      weight: 20,
      done: f.riskyApprovals === 0,
      detail:
        f.riskyApprovals === 0
          ? "Nothing risky can spend your tokens"
          : `${plural(f.riskyApprovals, "risky approval", "risky approvals")} open`,
    },
    {
      id: "poison",
      title: "Poisoned addresses flagged",
      weight: 15,
      done: f.unflaggedPoison === 0,
      detail:
        f.unflaggedPoison === 0
          ? "No lookalike addresses waiting in your history"
          : `${plural(f.unflaggedPoison, "lookalike address", "lookalike addresses")} in your history`,
    },
  ];
}

/** 0 to 100: the weights of the checks that pass. */
export function securityScore(checks: readonly SecurityCheck[]): number {
  return checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
}
