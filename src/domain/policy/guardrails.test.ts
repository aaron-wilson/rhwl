import { describe, expect, it } from "vitest";
import { checkGuardrails, type GuardrailFacts, type Guardrails } from "./guardrails";

const now = new Date("2026-09-29T16:00:00Z");
const minutes = (n: number) => n * 60_000;
const facts = (over: Partial<GuardrailFacts> = {}): GuardrailFacts => ({
  now,
  addsRisk: true,
  memeBuyCents: 0n,
  memeSpentCents: 0n,
  valueCents: 10_000n,
  leverage: undefined,
  lossStreak: 0,
  lastLossAt: undefined,
  ...over,
});
const all: Guardrails = {
  memeBudgetCents: 50_000n,
  maxLeverage: 5,
  sleepOnIt: { thresholdCents: 100_000n, delayMs: minutes(10) },
  coolOff: { losses: 3, ms: minutes(60) },
};

describe("checkGuardrails", () => {
  it.each<[string, Guardrails, Partial<GuardrailFacts>, unknown]>([
    ["no guardrails", {}, { memeBuyCents: 10n ** 9n, leverage: 50 }, { kind: "allow" }],
    ["within budget", all, { memeBuyCents: 20_000n, memeSpentCents: 30_000n }, { kind: "allow" }],
    [
      "over the meme budget",
      all,
      { memeBuyCents: 20_000n, memeSpentCents: 40_000n },
      {
        kind: "block",
        reasons: [
          "That's $100.00 over your $500.00 weekly meme budget. It frees up as older buys pass seven days.",
        ],
      },
    ],
    ["at the leverage cap", all, { leverage: 5 }, { kind: "allow" }],
    [
      "over the leverage cap",
      all,
      { leverage: 10 },
      { kind: "block", reasons: ["Your leverage cap is 5x. Lower it to open this."] },
    ],
    [
      "on cool-off",
      all,
      { lossStreak: 3, lastLossAt: new Date(now.getTime() - minutes(15)) },
      {
        kind: "block",
        reasons: ["3 losing trades in a row. New trades pause for 45m so you can reset."],
      },
    ],
    [
      "after the cool-off has passed",
      all,
      { lossStreak: 4, lastLossAt: new Date(now.getTime() - minutes(61)) },
      { kind: "allow" },
    ],
    ["two losses only", all, { lossStreak: 2, lastLossAt: now }, { kind: "allow" }],
    [
      "large enough to sleep on",
      all,
      { valueCents: 100_001n },
      {
        kind: "delay",
        until: new Date(now.getTime() + minutes(10)),
        reasons: ["Over $1,000.00, so this waits 10m before you sign, as you asked."],
      },
    ],
    [
      "reducing risk, whatever the limits",
      all,
      { addsRisk: false, leverage: 99, lossStreak: 9, lastLossAt: now },
      { kind: "allow" },
    ],
  ])("%s", (_name, rails, over, decision) => {
    expect(checkGuardrails(rails, facts(over))).toEqual(decision);
  });

  it("reports every broken rule at once, and a block wins over a delay", () => {
    const decision = checkGuardrails(
      all,
      facts({
        memeBuyCents: 60_000n,
        valueCents: 200_000n,
        leverage: 20,
        lossStreak: 3,
        lastLossAt: now,
      }),
    );
    expect(decision.kind).toBe("block");
    expect(decision.kind === "block" ? decision.reasons : []).toHaveLength(3);
  });
});
