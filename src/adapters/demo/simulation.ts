import { knownAddresses } from "../../data/accounts";
import { assetById } from "../../data/assets";
import { add, amount } from "../../domain/money/amount";
import type { Chain } from "../../ports/chain";
import type { RiskFinding, Simulation } from "../../ports/simulation";
import { netEffects } from "../../domain/tx/effects";

/** Dry-runs a request against the demo chain's current state and flags what a careful wallet would. */
export function createDemoSimulation(chain: Chain): Simulation {
  return {
    simulate(account, request) {
      const deltas = netEffects(request);
      const held = new Map(chain.balances(account).map((h) => [h.assetId, h.quantity]));
      const findings: RiskFinding[] = [];

      const short = deltas.find(({ assetId, quantity }) => {
        const start = held.get(assetId) ?? amount(0n, quantity.decimals);
        return add(start, quantity).base < 0n;
      });
      const failure =
        short === undefined
          ? undefined
          : `Not enough ${assetById(short.assetId).symbol} for this and its fee`;
      if (failure !== undefined)
        findings.push({ id: "insufficient-balance", severity: "danger", message: failure });

      const to = request.to?.toLowerCase();
      if (to !== undefined && knownAddresses.drainers.has(to)) {
        findings.push({
          id: "known-drainer",
          severity: "danger",
          message: "This address has drained other wallets. Do not continue.",
        });
      }
      if (request.kind === "approve" && request.allowance === "unlimited") {
        findings.push({
          id: "unlimited-approval",
          severity: "warning",
          message: "Grants unlimited spending of this token until you revoke it.",
        });
      }
      if (
        request.kind === "contract" &&
        to !== undefined &&
        !knownAddresses.verifiedContracts.has(to)
      ) {
        findings.push({
          id: "unverified-contract",
          severity: "warning",
          message: "This contract's source is not verified.",
        });
      }
      const sentBefore = chain.history(account).some((tx) => tx.request.to?.toLowerCase() === to);
      if (request.kind === "send" && to !== undefined && !sentBefore) {
        findings.push({
          id: "first-time-recipient",
          severity: "info",
          message: "You haven't sent to this address before.",
        });
      }

      return { deltas, findings, failure };
    },
  };
}
