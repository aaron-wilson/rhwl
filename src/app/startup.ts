import * as z from "zod/mini";
import { DEFAULT_SEED } from "../data/world";

/** Named moments the demo can open at. Each is also a shareable link: /?scenario=weekend-gap. */
export const scenarios = {
  "green-day": { at: "2026-09-29T19:30:00Z", seed: "day-2" },
  "red-day": { at: "2026-09-29T19:30:00Z", seed: "day-17" },
  "weekend-gap": { at: "2026-10-03T16:00:00Z", seed: "gap-99" },
  "earnings-night": { at: "2026-11-18T21:30:00Z", seed: DEFAULT_SEED },
  "meme-mania": { at: "2026-09-30T02:00:00Z", seed: "mania" },
  "fresh-install": { at: "2026-09-29T16:00:00Z", seed: DEFAULT_SEED },
} as const;

export type ScenarioName = keyof typeof scenarios;

export interface Startup {
  readonly seed: string;
  readonly start: Date;
  readonly scenario: ScenarioName | undefined;
  /** ?freeze=1: the demo clock starts stopped, so tests and presenters step time by hand. */
  readonly freeze: boolean;
  /** ?step=PT8S with ?freeze=1: advance the frozen clock once, after the app mounts. */
  readonly step: number | undefined;
  /** ?presenter=1: show the presenter bar with its clock buttons. */
  readonly presenter: boolean;
  /** ?frame=1: this app is the one inside the presenter's phone frame. */
  readonly frame: boolean;
}

const Seed = z.string().check(z.regex(/^[\w-]{1,32}$/));
const At = z.iso.datetime();
const isScenario = (value: string): value is ScenarioName => Object.hasOwn(scenarios, value);

const DURATION = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/** Milliseconds from an ISO 8601 duration of days to seconds (PT8S, P1D, P1DT2H) or plain ms. */
export function parseStep(value: string | null): number | undefined {
  if (value === null) return undefined;
  if (/^\d{1,12}$/.test(value)) return Number(value);
  const match = DURATION.exec(value);
  if (match === null || value === "P" || value.endsWith("T")) return undefined;
  const part = (index: number) => Number(match[index] ?? 0);
  return part(1) * 86_400_000 + part(2) * 3_600_000 + part(3) * 60_000 + part(4) * 1000;
}

function accept(schema: z.ZodMiniType<string>, value: string | null): string | undefined {
  return value !== null && schema.safeParse(value).success ? value : undefined;
}

/**
 * Reads ?seed, ?at, ?scenario, ?freeze, ?step and ?presenter once at startup. Explicit seed and at win over
 * a scenario's; anything invalid is ignored rather than breaking the demo.
 */
export function readStartup(search: string, now: Date): Startup {
  const query = new URLSearchParams(search);
  const name = query.get("scenario") ?? "";
  const scenario = isScenario(name) ? name : undefined;
  const preset = scenario === undefined ? undefined : scenarios[scenario];
  return {
    seed: accept(Seed, query.get("seed")) ?? preset?.seed ?? DEFAULT_SEED,
    start: new Date(accept(At, query.get("at")) ?? preset?.at ?? now.toISOString()),
    scenario,
    freeze: query.get("freeze") === "1",
    step: parseStep(query.get("step")),
    presenter: query.get("presenter") === "1",
    frame: query.get("frame") === "1",
  };
}
