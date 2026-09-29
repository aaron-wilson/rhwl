import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { designRules } from "./design-rules.js";

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.tsx"],
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    },
    designRules,
  ],
});

async function lint(code: string, filePath = "src/features/example.tsx") {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === "no-restricted-syntax")
    .map((m) => m.message);
}

describe("design lint rules", () => {
  it.each([
    ["hex in a style", `const a = <div style={{ color: "#ff0000" }} />;`],
    ["color function", `const a = "rgb(0 0 0)";`],
    ["raw palette utility", `const a = <div className="bg-blue-500" />;`],
    ["arbitrary spacing", `const a = <div className="p-[13px]" />;`],
    ["hex in a template", "const a = `border-[#fff] ${1}`;"],
    ["inline spring", `const t = { type: "spring", stiffness: 500, damping: 40 };`],
    ["inline duration", `const t = { duration: 0.2 };`],
    ["inline bezier", `const t = { ease: [0.4, 0, 1, 1] };`],
  ])("rejects %s", async (_name, code) => {
    expect(await lint(code)).not.toHaveLength(0);
  });

  it.each([
    ["token utilities", `const a = <div className="bg-surface text-ink p-4 rounded-md" />;`],
    ["splash tokens", `const a = <div className="text-splash-sky bg-gain-soft" />;`],
    ["plain numbers and ids", `const a = <a href="#top">Top</a>;`],
    ["motion presets", `const t = { transition: spring.snappy, ...tween("base", "exit") };`],
  ])("allows %s", async (_name, code) => {
    expect(await lint(code)).toEqual([]);
  });

  it("does not apply inside the token source", async () => {
    expect(await lint(`const a = "#ff0000";`, "src/tokens/color.ts")).toEqual([]);
  });
});
