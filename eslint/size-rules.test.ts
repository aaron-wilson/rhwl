import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { MAX_LINES, sizeRules } from "./size-rules.js";

const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: sizeRules });
const lines = (count: number) =>
  Array.from({ length: count }, (_, i) => `export const v${i} = ${i};`).join("\n");

async function tooLong(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).some((m) => m.ruleId === "max-lines");
}

describe("file size ceiling", () => {
  it("allows a file at the ceiling and rejects one line more", async () => {
    expect(await tooLong(lines(MAX_LINES), "src/features/new/NewPage.tsx")).toBe(false);
    expect(await tooLong(lines(MAX_LINES + 1), "src/features/new/NewPage.tsx")).toBe(true);
  });

  it("does not count blank lines or comments", async () => {
    const padded = `${lines(MAX_LINES)}\n\n// why\n/* and why */\n`;
    expect(await tooLong(padded, "src/domain/x.ts")).toBe(false);
  });

  it("exempts tests", async () => {
    expect(await tooLong(lines(MAX_LINES * 2), "src/features/new/new.test.tsx")).toBe(false);
  });
});
