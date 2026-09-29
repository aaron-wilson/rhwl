import { createDemoChain } from "../../adapters/demo/chain";
import { genesis } from "../../data/accounts";
import { pastTransactions } from "../../data/history";
import { DEFAULT_SEED } from "../../data/world";
import { describe, expect, it } from "vitest";
import { testProviders } from "../../test/providers";
import { securityChecks, securityScore, type SecurityFacts } from "./checks";
import { poisonedSenders } from "./poison";

const perfect: SecurityFacts = {
  backupVerified: true,
  signer: "passkey",
  autoLock: true,
  guardrails: true,
  riskyApprovals: 0,
  unflaggedPoison: 0,
};

describe("security checks", () => {
  it("weigh 100 in all and score 100 when everything passes", () => {
    const checks = securityChecks(perfect);
    expect(checks.reduce((sum, c) => sum + c.weight, 0)).toBe(100);
    expect(securityScore(checks)).toBe(100);
  });

  it.each([
    ["backupVerified", false, "backup", 80],
    ["signer", "watch", "signer", 85],
    ["autoLock", false, "lock", 85],
    ["guardrails", false, "guardrails", 85],
    ["riskyApprovals", 2, "approvals", 80],
    ["unflaggedPoison", 1, "poison", 85],
  ] as const)("fails %s and drops the score", (key, value, id, score) => {
    const checks = securityChecks({ ...perfect, [key]: value });
    expect(checks.filter((c) => !c.done).map((c) => c.id)).toEqual([id]);
    expect(securityScore(checks)).toBe(score);
  });

  it("counts what is open in the detail", () => {
    const checks = securityChecks({ ...perfect, riskyApprovals: 1, unflaggedPoison: 2 });
    expect(checks.find((c) => c.id === "approvals")?.detail).toBe("1 risky approval open");
    expect(checks.find((c) => c.id === "poison")?.detail).toBe(
      "2 lookalike addresses in your history",
    );
  });
});

/** The chain as the app starts it: genesis plus the seeded history. */
function seededHistory(account: string) {
  const { clock } = testProviders();
  return createDemoChain({ clock, seed: DEFAULT_SEED, genesis, history: pastTransactions }).history(
    account,
  );
}

describe("poisoned senders", () => {
  it("finds the seeded dust from a lookalike of stonks.rh, once", () => {
    const found = poisonedSenders(seededHistory("main"));
    expect(found).toEqual([
      {
        address: "0x7a2c5b0e8d1f4a9c6e2b7d03f5a8c1e9b4d23f19",
        imitates: { address: "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3f19", label: "stonks.rh" },
      },
    ]);
  });

  it("finds nothing for an account with no dust", () => {
    expect(poisonedSenders(seededHistory("degen"))).toEqual([]);
  });
});
