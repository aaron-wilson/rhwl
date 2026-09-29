// Feature code styles only through tokens. Values live in src/tokens and nowhere else.
const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
const utility =
  "bg|text|border|ring|fill|stroke|from|to|via|outline|shadow|divide|accent|caret|decoration";

const banned = [
  { pattern: "#[0-9a-fA-F]{3,8}\\b", message: "Use a color token, not a hex code." },
  {
    pattern: "\\b(rgba?|hsla?|oklch|oklab|hwb)\\(",
    message: "Use a color token, not a color function.",
  },
  {
    pattern: `\\b(${utility})-(${palette})(-\\d{2,3})?\\b`,
    message: "Raw palette utilities do not exist here. Use a semantic color token.",
  },
  {
    pattern: "-\\[[^\\]]*\\d(px|rem|em|ms|s|vh|vw)\\]",
    message: "Use a spacing, size, radius or duration token, not an arbitrary value.",
  },
];

const motionMessage = "Use a motion preset from src/tokens/motion.ts, not an inline value.";

const selectors = [
  ...banned.flatMap(({ pattern, message }) => [
    { selector: `Literal[value=/${pattern}/]`, message },
    { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
  ]),
  { selector: "Property[key.name=/^(stiffness|damping|mass|bounce)$/]", message: motionMessage },
  { selector: "Property[key.name='duration'][value.type='Literal']", message: motionMessage },
  { selector: "Property[key.name='ease'][value.type='ArrayExpression']", message: motionMessage },
];

/**
 * ESLint config block enforcing token-only styling in feature files.
 * @type {import("eslint").Linter.Config}
 */
export const designRules = {
  files: ["src/**/*.{ts,tsx}"],
  // Tests style nothing, and their fixtures name things like "Chainlets #412".
  ignores: ["src/tokens/**", "src/**/*.test.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": ["error", ...selectors],
  },
};
