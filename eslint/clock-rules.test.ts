import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { clockRules, wallClockAllowed } from "./clock-rules.js";

const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [clockRules] });

async function lint(code: string, filePath = "src/features/example.ts") {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.ruleId === "clock/no-wall-clock");
}

describe("wall-clock lint rule", () => {
  it.each([
    ["setTimeout", "setTimeout(() => {}, 10);"],
    ["setInterval", "setInterval(() => {}, 10);"],
    ["window.setTimeout", "window.setTimeout(() => {}, 10);"],
    ["Date.now", "const t = Date.now();"],
    ["performance.now", "const t = performance.now();"],
    ["new Date()", "const t = new Date();"],
  ])("rejects %s and names the Clock port", async (_name, code) => {
    const messages = await lint(code);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toContain("Clock port");
  });

  it.each([
    ["the clock port", "declare const clock: { now(): Date }; const t = clock.now();"],
    ["a date from a value", `const t = new Date("2026-09-29T16:00:00Z");`],
    ["clearing a timer", "clearTimeout(1);"],
  ])("allows %s", async (_name, code) => {
    expect(await lint(code)).toHaveLength(0);
  });

  it.each([...wallClockAllowed, "src/adapters/browser/clock.ts", "src/app/example.test.ts"])(
    "does not apply to %s",
    async (filePath) => {
      expect(await lint("const t = Date.now();", filePath)).toHaveLength(0);
    },
  );

  it("allows exactly three files by name", () => {
    expect(wallClockAllowed).toEqual([
      "src/app/routes.ts",
      "src/app/shell/useLongPress.ts",
      "src/features/tour/Tour.tsx",
    ]);
  });
});
