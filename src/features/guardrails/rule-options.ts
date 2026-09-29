import type { Guardrails } from "../../domain/policy/guardrails";

const MINUTE = 60_000;

/** Preset choices for each guardrail, as the settings page offers them. */
export const budgetOptions = [
  { value: "10000", label: "$100" },
  { value: "25000", label: "$250" },
  { value: "50000", label: "$500" },
  { value: "100000", label: "$1,000" },
] as const;

export const leverageOptions = [
  { value: "2", label: "2x" },
  { value: "5", label: "5x" },
  { value: "10", label: "10x" },
] as const;

export const sleepThresholdOptions = [
  { value: "50000", label: "$500" },
  { value: "100000", label: "$1,000" },
  { value: "500000", label: "$5,000" },
] as const;

export const sleepDelayOptions = [
  { value: String(5 * MINUTE), label: "5 min" },
  { value: String(10 * MINUTE), label: "10 min" },
  { value: String(30 * MINUTE), label: "30 min" },
] as const;

export const coolOffOptions = [
  { value: String(30 * MINUTE), label: "30 min" },
  { value: String(60 * MINUTE), label: "1 hour" },
  { value: String(240 * MINUTE), label: "4 hours" },
] as const;

/** What each rule starts at when switched on. */
export const defaults: Required<Guardrails> = {
  memeBudgetCents: 25_000n,
  maxLeverage: 5,
  sleepOnIt: { thresholdCents: 100_000n, delayMs: 10 * MINUTE },
  coolOff: { losses: 3, ms: 60 * MINUTE },
};

/** Removes one rule, leaving the rest. */
export function without(rails: Guardrails, key: keyof Guardrails): Guardrails {
  return Object.fromEntries(Object.entries(rails).filter(([k]) => k !== key));
}
