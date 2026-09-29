import type { CorporateAction } from "../../data/types";
import { amount, divRound, parseAmount, pow10, type Amount } from "../money/amount";
import { etToUtc } from "./hours";

/** Multipliers are exact to 12 decimals; the catalog uses at most 6. */
export const MULTIPLIER_DECIMALS = 12;
const ONE = pow10(MULTIPLIER_DECIMALS);

export interface ActionStep {
  readonly action: CorporateAction;
  /** When it took effect: midnight New York time on its date. */
  readonly effective: Date;
  readonly multiplier: Amount;
  /** Shares per token this action added; 0 for the launch. */
  readonly added: Amount;
}

function parseMultiplier(text: string): Amount {
  const value = parseAmount(text, MULTIPLIER_DECIMALS);
  if (value === undefined || value.base <= 0n) throw new RangeError(`Bad multiplier ${text}`);
  return value;
}

/** Every action that has taken effect by `at`, oldest first, with its step size. */
export function actionSteps(actions: readonly CorporateAction[], at: Date): readonly ActionStep[] {
  const steps: ActionStep[] = [];
  for (const action of actions) {
    const effective = etToUtc(action.date, 0);
    if (effective.getTime() > at.getTime()) break;
    const multiplier = parseMultiplier(action.multiplier);
    const previous = steps.at(-1)?.multiplier.base;
    steps.push({
      action,
      effective,
      multiplier,
      added: amount(multiplier.base - (previous ?? multiplier.base), MULTIPLIER_DECIMALS),
    });
  }
  return steps;
}

/** Shares one token represents at `at`: 1 before any action. */
export function multiplierAt(actions: readonly CorporateAction[], at: Date): Amount {
  return actionSteps(actions, at).at(-1)?.multiplier ?? amount(ONE, MULTIPLIER_DECIMALS);
}

/**
 * The part of the multiplier that came from reinvested dividends rather than
 * splits: the current multiplier minus what splits alone would have made it.
 */
export function dividendShares(actions: readonly CorporateAction[], at: Date): Amount {
  const steps = actionSteps(actions, at);
  let splitsOnly = ONE;
  let previous = ONE;
  for (const step of steps) {
    if (step.action.kind === "split") {
      splitsOnly = divRound(splitsOnly * step.multiplier.base, previous);
    }
    previous = step.multiplier.base;
  }
  return amount(previous - splitsOnly, MULTIPLIER_DECIMALS);
}

/** Shares a token balance represents, or gained, for a per-token multiplier. Six decimals. */
export function sharesFor(tokens: Amount, perToken: Amount): Amount {
  return amount(
    divRound(tokens.base * perToken.base, pow10(tokens.decimals + perToken.decimals - 6)),
    6,
  );
}
