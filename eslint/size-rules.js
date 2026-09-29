// One responsibility per file keeps files small. There are no exceptions: a
// file that grows past the ceiling is split by the change that grows it.
export const MAX_LINES = 200;
const counting = { skipBlankLines: true, skipComments: true };

const tests = ["src/**/*.test.{ts,tsx}", "src/test/**"];

/** @type {import("eslint").Linter.Config[]} */
export const sizeRules = [
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: tests,
    rules: { "max-lines": ["error", { max: MAX_LINES, ...counting }] },
  },
];
