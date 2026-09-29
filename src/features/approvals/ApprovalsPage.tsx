import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import type { Approval } from "../../data/approvals";
import { assetById } from "../../data/assets";
import { chainName } from "../../data/chains";
import { approvalAgeDays, assessApproval, byRisk } from "../../domain/approvals/risk";
import { amount } from "../../domain/money/amount";
import { formatToken } from "../../domain/money/format";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { revokeApprovals, spenderLabel, useApprovals } from "./approvals-store";

const tone = { danger: "loss", warning: "warn", ok: "neutral" } as const;
const riskText = { danger: "Dangerous", warning: "Risky", ok: "Looks fine" } as const;

function Allowance({ approval }: { readonly approval: Approval }) {
  if (approval.allowance === "unlimited") return <>Unlimited</>;
  const asset = assetById(approval.assetId);
  return <Private>{formatToken(amount(approval.allowance, asset.decimals), asset.symbol)}</Private>;
}

/** Every allowance the account has granted, riskiest first; revoke any set in one signature. */
export function ApprovalsPage() {
  const providers = useProviders();
  const account = useActiveAccount();
  const now = useNow(60_000);
  const approvals = [...useApprovals(account)].sort(byRisk(now));
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const chosen = approvals.filter((a) => selected.has(a.id));
  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };
  async function revoke() {
    setBusy(true);
    if (await revokeApprovals(providers, account, chosen)) setSelected(new Set());
    setBusy(false);
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
      <PageHeader title="Approvals" subtitle="Who may spend your tokens, on every network" />
      {approvals.length === 0 ? (
        <Card className="text-body text-ink-2">No approvals. Nothing can spend your tokens.</Card>
      ) : (
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setSelected(
                new Set(
                  approvals.filter((a) => assessApproval(a, now).risk !== "ok").map((a) => a.id),
                ),
              );
            }}
          >
            Select risky
          </Button>
          <ul aria-label="Approvals" className="flex flex-col gap-2">
            {approvals.map((a) => {
              const { risk, reasons } = assessApproval(a, now);
              const symbol = assetById(a.assetId).symbol;
              return (
                <li key={a.id}>
                  <Card className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      aria-label={`Select ${symbol} for ${spenderLabel(a)} on ${chainName(a.chain)}`}
                      checked={selected.has(a.id)}
                      onChange={() => {
                        toggle(a.id);
                      }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="text-headline font-semibold whitespace-nowrap">
                          {symbol} · {spenderLabel(a)}
                        </span>
                        <Badge tone={tone[risk]}>{riskText[risk]}</Badge>
                      </span>
                      <span className="text-footnote text-ink-2">
                        <Allowance approval={a} /> · {chainName(a.chain)} ·{" "}
                        {approvalAgeDays(a, now)} days ago
                      </span>
                      {reasons.length > 0 && (
                        <span className="text-footnote text-ink-2">{reasons.join(". ")}.</span>
                      )}
                    </span>
                  </Card>
                </li>
              );
            })}
          </ul>
          <Button
            size="lg"
            block
            disabled={chosen.length === 0 || busy}
            loading={busy}
            onClick={() => void revoke()}
          >
            {chosen.length === 0
              ? "Select approvals to revoke"
              : `Revoke ${chosen.length} in one signature`}
          </Button>
        </>
      )}
    </div>
  );
}
