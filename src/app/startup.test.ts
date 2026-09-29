import { describe, expect, it } from "vitest";
import { parseStep, readStartup } from "./startup";

const now = new Date("2026-09-27T12:00:00Z");

describe("readStartup", () => {
  it("defaults to the real time and the default seed", () => {
    expect(readStartup("", now)).toEqual({
      seed: "rhwl",
      start: now,
      scenario: undefined,
      freeze: false,
      step: undefined,
      presenter: false,
      frame: false,
    });
  });

  it("opens a scenario at its moment and seed", () => {
    const startup = readStartup("?scenario=weekend-gap", now);
    expect(startup.scenario).toBe("weekend-gap");
    expect(startup.start.toISOString()).toBe("2026-10-03T16:00:00.000Z");
  });

  it("lets explicit seed and time win over the scenario", () => {
    const startup = readStartup("?scenario=weekend-gap&seed=abc&at=2026-10-05T14:00:00Z", now);
    expect(startup).toEqual({
      seed: "abc",
      start: new Date("2026-10-05T14:00:00Z"),
      scenario: "weekend-gap",
      freeze: false,
      step: undefined,
      presenter: false,
      frame: false,
    });
  });

  it("reads ?freeze=1", () => {
    expect(readStartup("?freeze=1", now).freeze).toBe(true);
    expect(readStartup("?freeze=yes", now).freeze).toBe(false);
  });

  it("reads ?presenter=1 and ?step", () => {
    expect(readStartup("?presenter=1", now).presenter).toBe(true);
    expect(readStartup("?freeze=1&step=PT8S", now).step).toBe(8000);
  });

  it.each([
    ["PT8S", 8000],
    ["P1D", 86_400_000],
    ["P1DT2H30M", 95_400_000],
    ["PT5M", 300_000],
    ["1500", 1500],
  ])("parses the step %s as %i ms", (value, ms) => {
    expect(parseStep(value)).toBe(ms);
  });

  it.each(["", "P", "PT", "8s", "PT-1S", "P1W", "1.5", "PT1.5S", "tomorrow"])(
    "rejects the step %j",
    (value) => {
      expect(parseStep(value)).toBeUndefined();
    },
  );

  it.each([
    "?seed=a%20b",
    "?at=yesterday",
    "?scenario=moon",
    "?seed=" + "x".repeat(40),
    "?scenario=__proto__",
  ])("ignores the invalid %s", (search) => {
    const startup = readStartup(search, now);
    expect(startup.seed).toBe("rhwl");
    expect(startup.start).toEqual(now);
    expect(startup.scenario).toBeUndefined();
  });

  it("ignores an invalid step the way it ignores an invalid time", () => {
    expect(readStartup("?freeze=1&step=soon", now).step).toBeUndefined();
  });
});
