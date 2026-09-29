import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  color,
  contrastPairs,
  splash,
  splashContrastBg,
  splashContrastMin,
  splashSoftMix,
} from "./color";
import { contrastRatio, mix } from "./contrast";
import { generateThemeCss, generateTokensCss } from "./generate";

const themes = ["light", "dark"] as const;
const read = (name: string) => readFileSync(join(process.cwd(), "src/styles", name), "utf8");

describe("generated token CSS", () => {
  it("tokens.css matches the token source (run pnpm tokens if this fails)", () => {
    expect(read("tokens.css")).toBe(generateTokensCss());
  });

  it("theme.css matches the token source (run pnpm tokens if this fails)", () => {
    expect(read("theme.css")).toBe(generateThemeCss());
  });

  it.each(Object.keys(color))("maps color role %s into both files", (name) => {
    expect(generateTokensCss()).toContain(`--rh-color-${name}:`);
    expect(generateThemeCss()).toContain(`--color-${name}: var(--rh-color-${name});`);
  });
});

describe("contrast", () => {
  const cases = themes.flatMap((theme) => contrastPairs.map((pair) => ({ theme, ...pair })));

  it.each(cases)("$theme: $fg on $bg meets $min ($use)", ({ theme, fg, bg, min }) => {
    expect(contrastRatio(color[fg][theme], color[bg][theme])).toBeGreaterThanOrEqual(min);
  });

  const splashCases = themes.flatMap((theme) =>
    Object.entries(splash).map(([name, value]) => ({ theme, name, value: value[theme] })),
  );

  it.each(splashCases)("$theme: splash $name reads as text on a surface", ({ theme, value }) => {
    const bg = color[splashContrastBg][theme];
    expect(contrastRatio(value, bg)).toBeGreaterThanOrEqual(splashContrastMin);
  });

  it.each(splashCases)("$theme: splash $name reads on its own soft chip", ({ theme, value }) => {
    const chip = mix(value, color[splashContrastBg][theme], splashSoftMix);
    expect(contrastRatio(value, chip)).toBeGreaterThanOrEqual(splashContrastMin);
  });

  it("mixes like CSS color-mix", () => {
    expect(mix("#000000", "#FFFFFF", 50)).toBe("#808080");
  });

  it("rejects colors it cannot measure", () => {
    expect(() => contrastRatio("#FFFFFF80", "#000000")).toThrow(/opaque/);
  });

  it("measures black on white as 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });
});
