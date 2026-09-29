import { Link } from "react-router";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { formatFiat } from "../../domain/money/format";
import { Card } from "../../ui/Card";
import { useActiveAccount } from "../accounts";
import { Private } from "../privacy";
import { useHoldings } from "../transactions";
import { memeSpentCents } from "./facts";
import { useGuardrails } from "./guardrails-store";

/** A ring that fills from the top as `share` goes from 0 to 1. */
function Ring({ share, over }: { readonly share: number; readonly over: boolean }) {
  const circumference = 2 * Math.PI * 16;
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="size-12 shrink-0 -rotate-90">
      <circle
        cx={20}
        cy={20}
        r={16}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={5}
      />
      <circle
        cx={20}
        cy={20}
        r={16}
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(1, share))}
        className={over ? "text-loss" : "text-live"}
      />
    </svg>
  );
}

/** This week's meme spend against the budget. Hidden when no budget is set. */
export function GuardrailsStatus({ link = false }: { readonly link?: boolean }) {
  const rails = useGuardrails();
  const { chain, market } = useProviders();
  const account = useActiveAccount();
  // Re-read when balances change, since a settled buy changes the week's spend.
  useHoldings(account);
  const now = useNow(60_000);
  const budget = rails.memeBudgetCents;
  if (budget === undefined) return null;
  const spent = memeSpentCents(chain.history(account), market, now);
  const share = budget === 0n ? 1 : Number((spent * 1000n) / budget) / 1000;
  const body = (
    <Card className="flex items-center gap-4" data-testid="guardrails-status">
      <Ring share={share} over={spent > budget} />
      <span className="flex flex-col">
        <span className="text-headline font-semibold">
          <Private>{formatFiat(spent)}</Private> of {formatFiat(budget)}
        </span>
        <span className="text-footnote text-ink-3">into memes in the last seven days</span>
      </span>
    </Card>
  );
  return link ? (
    <Link to="/guardrails" aria-label="Guardrails" className="rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}
