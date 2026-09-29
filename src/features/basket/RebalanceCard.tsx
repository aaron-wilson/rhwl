import { useState } from "react";
import { useProviders } from "../../app/providers-context";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import {
  currentBps,
  maxDriftBps,
  REBALANCE_AT_BPS,
  weightProblems,
  type Weight,
} from "../../domain/basket/basket";
import { formatPercentBps } from "../../domain/money/format";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { useActiveAccount } from "../accounts";
import { useHoldings } from "../transactions";
import { runTransaction } from "../transactions/actions";
import { memberValues, rebalanceRequest } from "./basket-request";

/** Current share against target for each member, and a one-signature rebalance once drift is large. */
export function RebalanceCard({
  name,
  weights,
}: {
  readonly name: string;
  readonly weights: readonly Weight[];
}) {
  const providers = useProviders();
  const account = useActiveAccount();
  const holdings = useHoldings(account);
  const now = useNow();
  const [sending, setSending] = useState(false);
  if (weightProblems(weights).length > 0) return null;
  const values = memberValues(weights, holdings, providers.market, now);
  const current = currentBps(values);
  const drift = maxDriftBps(values, weights);
  const due = drift >= REBALANCE_AT_BPS;

  async function rebalance() {
    const request = rebalanceRequest(name, weights, holdings, providers.market, now);
    if (request === undefined) return;
    setSending(true);
    await runTransaction(providers, account, request);
    setSending(false);
  }

  return (
    <section aria-labelledby="basket-drift" className="flex flex-col gap-2">
      <h2 id="basket-drift" className="px-1 text-footnote font-semibold text-ink-3">
        Drift
      </h2>
      <Card className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1 text-footnote">
          {weights.map((w, i) => (
            <li key={w.assetId} className="flex justify-between gap-3">
              <span>{assetById(w.assetId).symbol}</span>
              <span className="text-ink-2 tabular-nums">
                {formatPercentBps(BigInt(current[i] ?? 0), "negative")} now ·{" "}
                {formatPercentBps(BigInt(w.bps), "negative")} target
              </span>
            </li>
          ))}
        </ul>
        <p
          className={due ? "text-footnote text-warn" : "text-footnote text-ink-3"}
          data-testid="drift"
        >
          {due
            ? `Off target by up to ${formatPercentBps(BigInt(drift), "negative")}. Rebalancing sells what is over and buys what is under, in one signature.`
            : `Within ${formatPercentBps(BigInt(REBALANCE_AT_BPS), "negative")} of target. Nothing to do.`}
        </p>
        {due && (
          <Button variant="secondary" loading={sending} onClick={() => void rebalance()}>
            Rebalance
          </Button>
        )}
      </Card>
    </section>
  );
}
