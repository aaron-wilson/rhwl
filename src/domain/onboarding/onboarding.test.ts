import { describe, expect, it } from "vitest";
import {
  advance,
  IllegalOnboardingStep,
  initialOnboarding,
  type OnboardingEvent,
  type OnboardingStep,
} from "./machine";
import { checkName } from "./names";

const run = (...events: OnboardingEvent[]) => events.reduce(advance, initialOnboarding);
const happy: OnboardingEvent[] = [
  { type: "start" },
  { type: "choose_passkey" },
  { type: "passkey_created" },
  { type: "claim_name", name: "moonboy" },
  { type: "choose_region", region: "GB" },
];

describe("onboarding machine", () => {
  it("walks splash → method → passkey → name → region → done", () => {
    expect(run(...happy)).toEqual({ step: "done", name: "moonboy", region: "GB" });
  });

  it("reaches the name step by phrase-and-quiz and by import", () => {
    const start: OnboardingEvent[] = [{ type: "start" }];
    expect(
      run(...start, { type: "choose_phrase" }, { type: "phrase_saved" }, { type: "quiz_passed" })
        .step,
    ).toBe("name");
    expect(run(...start, { type: "choose_import" }, { type: "imported" }).step).toBe("name");
    expect(
      run(...start, { type: "choose_phrase" }, { type: "phrase_saved" }, { type: "back" }).step,
    ).toBe("phrase");
    expect(run(...start, { type: "choose_import" }, { type: "back" }).step).toBe("method");
  });

  it("goes back from method to splash and from region to name, keeping the name", () => {
    expect(run({ type: "start" }, { type: "back" }).step).toBe("splash");
    expect(run(...happy.slice(0, 4), { type: "back" })).toMatchObject({
      step: "name",
      name: "moonboy",
    });
  });

  const steps: readonly OnboardingStep[] = [
    "splash",
    "method",
    "passkey",
    "phrase",
    "quiz",
    "import",
    "name",
    "region",
    "done",
  ];
  const paths: Record<OnboardingStep, readonly OnboardingEvent[]> = {
    splash: [],
    method: happy.slice(0, 1),
    passkey: happy.slice(0, 2),
    phrase: [{ type: "start" }, { type: "choose_phrase" }],
    quiz: [{ type: "start" }, { type: "choose_phrase" }, { type: "phrase_saved" }],
    import: [{ type: "start" }, { type: "choose_import" }],
    name: happy.slice(0, 3),
    region: happy.slice(0, 4),
    done: happy,
  };
  const events: readonly OnboardingEvent[] = [
    { type: "start" },
    { type: "choose_passkey" },
    { type: "passkey_created" },
    { type: "claim_name", name: "x" },
    { type: "choose_region", region: "GB" },
    { type: "back" },
    { type: "choose_phrase" },
    { type: "phrase_saved" },
    { type: "quiz_passed" },
    { type: "choose_import" },
    { type: "imported" },
  ];
  const legal: Record<OnboardingStep, readonly OnboardingEvent["type"][]> = {
    splash: ["start"],
    method: ["choose_passkey", "choose_phrase", "choose_import", "back"],
    passkey: ["passkey_created"],
    phrase: ["phrase_saved", "back"],
    quiz: ["quiz_passed", "back"],
    import: ["imported", "back"],
    name: ["claim_name"],
    region: ["choose_region", "back"],
    done: [],
  };
  const pairs = steps.flatMap((step) =>
    events.map(
      (event) => [step, event.type, legal[step].includes(event.type), paths[step], event] as const,
    ),
  );

  it.each(pairs)("%s + %s → legal: %s", (step, _type, isLegal, path, event) => {
    const from = run(...path);
    expect(from.step).toBe(step);
    if (isLegal) {
      expect(() => advance(from, event)).not.toThrow();
    } else {
      expect(() => advance(from, event)).toThrow(IllegalOnboardingStep);
    }
  });
});

describe(".rh names", () => {
  it.each([
    ["moonboy", "moonboy"],
    ["  Diamond-Paws.rh ", "diamond-paws"],
    ["gm3", "gm3"],
    ["a".repeat(20), "a".repeat(20)],
  ])("accepts %j as %s", (input, name) => {
    expect(checkName(input)).toEqual({ ok: true, name });
  });

  it.each([
    ["ab", /at least 3/],
    ["a".repeat(21), /at most 20/],
    ["moon boy", /letters, numbers and hyphens/],
    ["moon_boy", /letters, numbers and hyphens/],
    ["émoji", /letters, numbers and hyphens/],
    ["-moon", /start or end/],
    ["moon-", /start or end/],
    ["moon--boy", /two hyphens/],
    ["robinhood", /reserved/],
    ["Admin.rh", /reserved/],
  ])("rejects %j", (input, reason) => {
    const result = checkName(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(reason);
  });
});
