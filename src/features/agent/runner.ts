import { assetById } from "../../data/assets";
import { OPENING_AT } from "../../data/world";
import type { AgentRule } from "../../domain/agent/rule";
import { nextRun } from "../../domain/agent/schedule";
import { keyPermits, type AgentAction } from "../../domain/agent/session-key";
import { divRound, valueInCents } from "../../domain/money/amount";
import { basisFromHistory } from "../../domain/portfolio/cost-basis";
import type { Holding, TxRequest } from "../../ports/chain";
import type { Providers } from "../../ports/providers";
import { rebalanceRequest } from "../basket";
import { basketStore } from "../basket";
import { buyLeg, requestFromLegs, sellLeg } from "../trade";
import { optimisticHoldings } from "../transactions";
import { runTransaction } from "../transactions/actions";
import { agentStore, logFeed, newAgentId, updateKey, type GrantedKey } from "./agent-store";
import { checkCondition } from "./conditions";

type Deps = Pick<Providers, "clock" | "chain" | "simulation" | "market">;

const timers = new Map<number, () => void>();

const findKey = (id: number) => agentStore.get().keys.find((k) => k.id === id);

const firstRun = (rule: AgentRule, now: Date) =>
  nextRun(rule.intent === "take-profit" ? { kind: "daily" } : rule.cadence, now);

function schedule(deps: Deps, id: number): void {
  timers.get(id)?.();
  timers.delete(id);
  const at = findKey(id)?.nextAt;
  if (at === undefined) return;
  const cancel = deps.clock.schedule(
    () => {
      void runKey(deps, id);
    },
    Math.max(0, at.getTime() - deps.clock.now().getTime()),
  );
  timers.set(id, cancel);
}

/** Grants the agent a session key for one rule and schedules its first run. */
export function grantKey(deps: Deps, account: string, prompt: string, rule: AgentRule): number {
  const id = newAgentId();
  const now = deps.clock.now();
  const key: GrantedKey = {
    id,
    account,
    prompt,
    rule,
    grantedAt: now,
    revoked: false,
    spentCents: 0n,
    nextAt: firstRun(rule, now),
  };
  agentStore.set((s) => ({ ...s, keys: [...s.keys, key] }));
  schedule(deps, id);
  return id;
}

/** Revokes one key at once: its timer is cancelled and any signature it asks for is refused. */
export function revokeKey(id: number): void {
  timers.get(id)?.();
  timers.delete(id);
  updateKey(id, (k) => ({ ...k, revoked: true, nextAt: undefined }));
}

/** The kill switch: every key, now. */
export function revokeAll(): void {
  agentStore.get().keys.forEach((k) => {
    revokeKey(k.id);
  });
}

function takeProfit(deps: Deps, key: GrantedKey, holdings: readonly Holding[], now: Date) {
  const { rule } = key;
  if (rule.intent !== "take-profit") return undefined;
  const held = holdings.find((h) => h.assetId === rule.assetId)?.quantity;
  if (held === undefined || held.base === 0n) return { skip: "Nothing held to sell." };
  const history = deps.chain
    .history(key.account)
    .filter((tx) => tx.status === "confirmed")
    .flatMap((tx) =>
      tx.request.deltas
        .filter((d) => d.assetId === rule.assetId)
        .map((d) => ({ at: tx.settledAt ?? tx.submittedAt, quantity: d.quantity })),
    );
  const basis = basisFromHistory(held, history, OPENING_AT, (at) =>
    deps.market.price(rule.assetId, at),
  );
  const value = valueInCents(held, deps.market.price(rule.assetId, now));
  const gain =
    basis.costCents === 0n ? 0n : divRound((value - basis.costCents) * 10_000n, basis.costCents);
  if (gain < rule.gainBps)
    return { skip: `Up ${Number(gain) / 100}%, waiting for ${Number(rule.gainBps) / 100}%.` };
  const sellCents = (value * BigInt(rule.sellPercent)) / 100n;
  const leg = sellLeg(rule.assetId, sellCents, deps.market, now);
  return leg === undefined
    ? { skip: "Too small to sell." }
    : { request: requestFromLegs("Sold", "by your agent", [leg]) };
}

function plan(
  deps: Deps,
  key: GrantedKey,
  now: Date,
): { request?: TxRequest; action?: AgentAction; skip?: string } {
  const { rule } = key;
  const holdings = optimisticHoldings(deps.chain.balances(key.account), key.account);
  if (rule.intent === "rebalance") {
    const b = basketStore.get();
    const request = rebalanceRequest(b.name, b.weights, holdings, deps.market, now);
    return request === undefined
      ? { skip: "Already on target." }
      : { request, action: { assetId: undefined, side: "rebalance", spendCents: 0n } };
  }
  if (rule.intent === "take-profit") {
    const tp = takeProfit(deps, key, holdings, now);
    return tp?.request === undefined
      ? { skip: tp?.skip ?? "Nothing to do." }
      : { request: tp.request, action: { assetId: rule.assetId, side: "sell", spendCents: 0n } };
  }
  const symbol = assetById(rule.assetId).symbol;
  if (rule.condition !== undefined) {
    const check = checkCondition(rule.condition, rule.assetId, symbol, deps.market, now);
    if (!check.met) return { skip: `Condition not met: ${check.note}.` };
  }
  const leg = buyLeg(rule.assetId, rule.amountCents, deps.market, now);
  const request = leg === undefined ? undefined : requestFromLegs("Bought", "by your agent", [leg]);
  if (request === undefined) return { skip: "Too small to buy." };
  return { request, action: { assetId: rule.assetId, side: "buy", spendCents: rule.amountCents } };
}

/** One scheduled run: plan, check the key, sign as the agent, record the outcome, schedule the next. */
export async function runKey(deps: Deps, id: number): Promise<void> {
  const key = findKey(id);
  if (key === undefined || key.revoked) return;
  const now = deps.clock.now();
  if (now >= key.rule.expiresAt) {
    updateKey(id, (k) => ({ ...k, nextAt: undefined }));
    logFeed({
      keyId: id,
      at: now,
      outcome: "skipped",
      summary: undefined,
      note: "The key expired.",
    });
    return;
  }
  const step = plan(deps, key, now);
  const reason = step.action === undefined ? undefined : keyPermits(key, step.action, now);
  if (step.request === undefined || step.action === undefined || reason !== undefined) {
    logFeed({
      keyId: id,
      at: now,
      outcome: "skipped",
      summary: undefined,
      note: reason ?? step.skip ?? "Nothing to do.",
    });
  } else {
    const action = step.action;
    // The agent signs only while its key still covers the action, so revoking stops a run mid-flight.
    const tx = await runTransaction(deps, key.account, step.request, () =>
      Promise.resolve(keyPermits(findKey(id) ?? key, action, deps.clock.now()) === undefined),
    );
    const state = tx.machine.state;
    const outcome = state === "confirmed" ? "done" : tx.machine.blocked ? "held" : "failed";
    logFeed({
      keyId: id,
      at: deps.clock.now(),
      outcome,
      summary: step.request.summary,
      note:
        outcome === "held"
          ? (tx.simulation?.failure ?? "Held by your guardrails.")
          : outcome === "failed"
            ? (tx.machine.error ?? "Not signed.")
            : "",
    });
    if (state === "confirmed")
      updateKey(id, (k) => ({ ...k, spentCents: k.spentCents + action.spendCents }));
  }
  const latest = findKey(id);
  if (latest === undefined || latest.revoked) return;
  const done = latest.rule.intent === "take-profit" && step.request !== undefined;
  const cadence =
    latest.rule.intent === "take-profit" ? ({ kind: "daily" } as const) : latest.rule.cadence;
  updateKey(id, (k) => ({ ...k, nextAt: done ? undefined : nextRun(cadence, deps.clock.now()) }));
  schedule(deps, id);
}
