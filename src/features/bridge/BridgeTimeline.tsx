import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { assetById } from "../../data/assets";
import { bridgeLegs, type LegStatus } from "../../domain/bridge/machine";
import { formatToken } from "../../domain/money/format";
import { formatCountdown } from "../../domain/time/format";
import { Card } from "../../ui/Card";
import { icon } from "../../ui/icon";
import { Private } from "../privacy";
import { chainName, type BridgeJob } from "./bridge-store";

const legIcon: Record<LegStatus, ReactNode> = {
  done: <Check {...icon()} className="text-gain" />,
  current: <LoaderCircle {...icon()} className="animate-spin text-live" />,
  waiting: <span className="size-5 rounded-full border-2 border-line-strong" />,
  failed: <CircleAlert {...icon()} className="text-loss" />,
};

export interface BridgeTimelineProps {
  readonly jobs: readonly BridgeJob[];
  readonly now: Date;
}

/** The account's bridge transfers, each with its two-leg timeline. */
export function BridgeTimeline({ jobs, now }: BridgeTimelineProps) {
  if (jobs.length === 0) return null;
  return (
    <section aria-labelledby="transfers" className="flex flex-col gap-2">
      <h2 id="transfers" className="px-1 text-footnote font-semibold text-ink-3">
        Transfers
      </h2>
      <ul className="flex flex-col gap-2">
        {jobs.map((job) => (
          <li key={job.id}>
            <Transfer job={job} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface TransferProps {
  readonly job: BridgeJob;
  readonly now: Date;
}

function Transfer({ job, now }: TransferProps) {
  const [source, relay] = bridgeLegs(job.machine);
  const from = assetById(job.fromAsset);
  const to = assetById(job.toAsset);
  const left = job.arrivesAt === undefined ? undefined : job.arrivesAt.getTime() - now.getTime();
  return (
    <Card className="flex flex-col gap-3" data-testid="bridge-transfer">
      <p className="text-headline font-semibold">
        <Private>{formatToken(job.amountIn, from.symbol)}</Private> to {chainName(job.toChain)}
      </p>
      <ol aria-label="Legs" className="flex flex-col gap-2 text-footnote">
        <li className="flex items-center gap-2">
          {legIcon[source]}
          <span>Sent on {chainName(job.fromChain)}</span>
        </li>
        <li className="flex items-center gap-2">
          {legIcon[relay]}
          <span>
            {relay === "done" ? (
              <>
                Arrived: <Private>{formatToken(job.route.out, to.symbol)}</Private>
              </>
            ) : (
              `Delivered on ${chainName(job.toChain)}`
            )}
            {relay === "current" && left !== undefined && (
              <span className="text-ink-3"> · arrives in {formatCountdown(left)}</span>
            )}
          </span>
        </li>
      </ol>
      {job.machine.state === "failed" && (
        <p className="text-footnote text-loss">{job.machine.error}</p>
      )}
    </Card>
  );
}
