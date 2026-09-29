import { useMemo } from "react";
import { assetById } from "../../data/assets";
import { chainName } from "../../data/chains";
import type { Chain } from "../../data/types";
import {
  bridgeTransition,
  initialBridge,
  type BridgeEvent,
  type BridgeMachine,
} from "../../domain/bridge/machine";
import type { BridgeRoute } from "../../domain/bridge/routes";
import { amount, type Amount } from "../../domain/money/amount";
import { createStore, useStore } from "../../lib/store";
import type { BalanceDelta } from "../../ports/chain";
import type { Providers } from "../../ports/providers";
import { NETWORK_FEE } from "../transactions/actions";
import { runTransaction } from "../transactions/actions";

export interface BridgeJob {
  readonly id: number;
  readonly account: string;
  readonly fromChain: Chain["id"];
  readonly toChain: Chain["id"];
  readonly fromAsset: string;
  readonly toAsset: string;
  readonly amountIn: Amount;
  readonly route: BridgeRoute;
  readonly machine: BridgeMachine;
  /** When the relay is expected to deliver; set once the source leg confirms. */
  readonly arrivesAt: Date | undefined;
}

export const bridgeStore = createStore<readonly BridgeJob[]>([]);
let nextId = 1;

export { chainName };

/** What paying for the source leg costs, on the source network. */
function sourceFee(chain: Chain["id"]): BalanceDelta {
  if (chain === "solana") return { assetId: "sol:SOL", quantity: amount(-5_000n, 9) };
  if (chain === "robinhood") return NETWORK_FEE;
  const gas = chain === "ethereum" ? "eth:ETH" : chain === "arbitrum" ? "arb:ETH" : "base:ETH";
  // Ethereum mainnet gas is far dearer than an L2's.
  return {
    assetId: gas,
    quantity: amount(chain === "ethereum" ? -600_000_000_000_000n : -8_000_000_000_000n, 18),
  };
}

function update(id: number, event: BridgeEvent, arrivesAt?: Date): void {
  bridgeStore.set((jobs) =>
    jobs.map((job) =>
      job.id === id
        ? {
            ...job,
            machine: bridgeTransition(job.machine, event),
            ...(arrivesAt === undefined ? {} : { arrivesAt }),
          }
        : job,
    ),
  );
}

type Deps = Pick<Providers, "clock" | "chain" | "simulation">;

/**
 * Runs a bridge: the user signs the source leg; once it confirms, the relay
 * delivers on the destination after the route's time, as a second transaction
 * nobody has to sign. Resolves when the source leg settles, with whether it went out.
 */
export async function startBridge(
  deps: Deps,
  job: Omit<BridgeJob, "id" | "machine" | "arrivesAt">,
): Promise<boolean> {
  const id = nextId;
  nextId += 1;
  bridgeStore.set((jobs) => [
    { ...job, id, machine: initialBridge, arrivesAt: undefined },
    ...jobs,
  ]);
  const from = assetById(job.fromAsset);
  const to = assetById(job.toAsset);
  const out = amount(-job.amountIn.base, job.amountIn.decimals);
  const source = await runTransaction(deps, job.account, {
    kind: "bridge",
    summary: {
      verb: "Bridge",
      primary: { assetId: from.id, quantity: out },
      detail: `to ${chainName(job.toChain)} · leg 1 of 2`,
    },
    deltas: [{ assetId: from.id, quantity: out }],
    fee: sourceFee(job.fromChain),
  });
  if (source.machine.state !== "confirmed") {
    update(id, { type: "failed", error: source.machine.error ?? "The transfer was not sent" });
    return false;
  }
  const arrivesAt = new Date(deps.clock.now().getTime() + job.route.seconds * 1_000);
  update(id, { type: "source_confirmed" }, arrivesAt);
  deps.clock.schedule(() => {
    const deltas: BalanceDelta[] = [{ assetId: to.id, quantity: job.route.out }];
    if (job.route.refuel !== undefined)
      deltas.push({ assetId: "rh:ETH", quantity: job.route.refuel });
    void runTransaction(
      deps,
      job.account,
      {
        kind: "bridge",
        summary: {
          verb: "Received",
          primary: { assetId: to.id, quantity: job.route.out },
          detail: `from ${chainName(job.fromChain)} · leg 2 of 2`,
        },
        deltas,
        fee: {
          assetId: sourceFee(job.toChain).assetId,
          quantity: amount(0n, assetById(sourceFee(job.toChain).assetId).decimals),
        },
      },
      // The relay delivers; there is nothing for the user to sign.
      () => Promise.resolve(true),
    ).then((tx) => {
      update(
        id,
        tx.machine.state === "confirmed"
          ? { type: "delivered" }
          : { type: "failed", error: tx.machine.error ?? "The relay did not deliver" },
      );
    });
  }, job.route.seconds * 1_000);
  return true;
}

export function useBridges(account: string): readonly BridgeJob[] {
  const jobs = useStore(bridgeStore);
  return useMemo(() => jobs.filter((j) => j.account === account), [jobs, account]);
}
