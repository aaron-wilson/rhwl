import { CircleCheck, CircleAlert, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import type { CheckId } from "../../domain/security/checks";
import { securityScore } from "../../domain/security/checks";
import { shortAddress } from "../../domain/keys/address";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { accountsStore, setActiveAccount, useActiveAccount } from "../accounts";
import { revokeApprovals } from "../approvals";
import { guardrailDefaults, setGuardrails } from "../guardrails";
import { autoLockStore } from "../lock";
import { signMessageAs } from "../transactions/actions";
import { ScoreMeter } from "./ScoreMeter";
import { backupVerifiedStore, flaggedStore, useSecurity } from "./security-store";

const fixLabel: Record<CheckId, string> = {
  backup: "Verify with passkey",
  signer: "Switch to a signing account",
  lock: "Lock after 5 min",
  guardrails: "Set trade limits",
  approvals: "Revoke risky approvals",
  poison: "Flag as scams",
};

/** A score out of 100, the checklist behind it, and a one-tap fix for each gap. */
export function SecurityPage() {
  const providers = useProviders();
  const account = useActiveAccount();
  const { checks, risky, poison } = useSecurity(account);
  const [busy, setBusy] = useState<CheckId | undefined>(undefined);

  const fixes: Record<CheckId, () => Promise<unknown> | undefined> = {
    backup: async () => {
      const signed = await signMessageAs(account, {
        payload: `Verify backup for ${account} at ${providers.clock.now().toISOString()}`,
        display: "Confirm you can still sign for this account. This moves no funds.",
      });
      if (signed !== undefined) backupVerifiedStore.set((list) => [...list, account]);
    },
    signer: () => {
      const signer = accountsStore.get().find((a) => a.kind !== "watch" && !a.hidden);
      if (signer !== undefined) setActiveAccount(signer.id);
      return undefined;
    },
    lock: () => {
      autoLockStore.set("300000");
      return undefined;
    },
    guardrails: () => {
      setGuardrails((r) => ({
        ...r,
        memeBudgetCents: guardrailDefaults.memeBudgetCents,
        maxLeverage: guardrailDefaults.maxLeverage,
      }));
      return undefined;
    },
    approvals: () => revokeApprovals(providers, account, risky),
    poison: () => {
      flaggedStore.set((list) => [...list, ...poison.map((p) => p.address)]);
      return undefined;
    },
  };

  async function fix(id: CheckId) {
    setBusy(id);
    await fixes[id]();
    setBusy(undefined);
  }

  return (
    <div className="mx-auto flex max-w-phone flex-col gap-4 px-4 pt-4 pb-8">
      <Link
        to="/settings"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Settings
      </Link>
      <PageHeader title="Security" subtitle="How safe this account is, and what would help" />
      <Card>
        <ScoreMeter score={securityScore(checks)} />
      </Card>
      <ul aria-label="Security checklist" className="flex flex-col gap-2">
        {checks.map((check) => (
          <li key={check.id}>
            <Card className="flex items-start gap-3">
              {check.done ? (
                <CircleCheck {...icon()} className="mt-1 shrink-0 text-gain" />
              ) : (
                <CircleAlert {...icon()} className="mt-1 shrink-0 text-warn" />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-headline font-semibold">{check.title}</span>
                <span className="text-footnote text-ink-2">{check.detail}</span>
                {check.id === "poison" && poison.length > 0 && (
                  <span className="text-footnote text-ink-2">
                    {poison
                      .map((p) => `${shortAddress(p.address)} imitates ${p.imitates.label}`)
                      .join(". ")}
                    .
                  </span>
                )}
                {!check.done && (
                  <Button
                    size="sm"
                    className="mt-1 self-start"
                    disabled={busy !== undefined}
                    loading={busy === check.id}
                    onClick={() => void fix(check.id)}
                  >
                    {fixLabel[check.id]}
                  </Button>
                )}
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
