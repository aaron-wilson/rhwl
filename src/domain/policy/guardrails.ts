import { formatFiat } from "../money/format";
import { formatCountdown } from "../time/format";
import { ALLOW, type PolicyDecision } from "./decision";

/** Limits the user sets on themself. Each one is off when left out. */
export interface Guardrails {
  /** Most that may go into memes in any rolling seven days, in cents. */
  readonly memeBudgetCents?: bigint;
  /** Highest leverage a new perp position may use. */
  readonly maxLeverage?: number;
  /** Trades worth more than the threshold wait this long before the signature. */
  readonly sleepOnIt?: { readonly thresholdCents: bigint; readonly delayMs: number };
  /** After this many losing trades in a row, new risk pauses for this long. */
  readonly coolOff?: { readonly losses: number; readonly ms: number };
}

/** What the guardrails need to know about one request, gathered by the wallet. */
export interface GuardrailFacts {
  readonly now: Date;
  /** Whether the request adds risk (a buy, swap in, or new position) rather than reducing it. */
  readonly addsRisk: boolean;
  /** Dollars this request puts into memes. */
  readonly memeBuyCents: bigint;
  /** Dollars put into memes in the seven days before now. */
  readonly memeSpentCents: bigint;
  /** Dollars leaving the account in this request, fee excluded. */
  readonly valueCents: bigint;
  readonly leverage: number | undefined;
  /** Losing trades in a row, most recent first, and when the last one settled. */
  readonly lossStreak: number;
  readonly lastLossAt: Date | undefined;
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Checks one request against the guardrails. Reducing risk (selling, closing)
 * is never blocked. Every broken rule is reported, not just the first; a
 * delay applies only when nothing blocks.
 */
export function checkGuardrails(rails: Guardrails, facts: GuardrailFacts): PolicyDecision {
  if (!facts.addsRisk) return ALLOW;
  const reasons: string[] = [];
  const budget = rails.memeBudgetCents;
  if (budget !== undefined && facts.memeBuyCents > 0n) {
    const after = facts.memeSpentCents + facts.memeBuyCents;
    if (after > budget) {
      reasons.push(
        `That's ${formatFiat(after - budget)} over your ${formatFiat(budget)} weekly meme budget. It frees up as older buys pass seven days.`,
      );
    }
  }
  const cap = rails.maxLeverage;
  if (cap !== undefined && facts.leverage !== undefined && facts.leverage > cap) {
    reasons.push(`Your leverage cap is ${cap}x. Lower it to open this.`);
  }
  const cool = rails.coolOff;
  if (cool !== undefined && facts.lossStreak >= cool.losses && facts.lastLossAt !== undefined) {
    const left = facts.lastLossAt.getTime() + cool.ms - facts.now.getTime();
    if (left > 0) {
      reasons.push(
        `${facts.lossStreak} losing trades in a row. New trades pause for ${formatCountdown(left)} so you can reset.`,
      );
    }
  }
  if (reasons.length > 0) return { kind: "block", reasons };
  const sleep = rails.sleepOnIt;
  if (sleep !== undefined && facts.valueCents > sleep.thresholdCents) {
    return {
      kind: "delay",
      until: new Date(facts.now.getTime() + sleep.delayMs),
      reasons: [
        `Over ${formatFiat(sleep.thresholdCents)}, so this waits ${formatCountdown(sleep.delayMs)} before you sign, as you asked.`,
      ],
    };
  }
  return ALLOW;
}
