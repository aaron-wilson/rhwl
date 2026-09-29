// Adapters are chosen in one place. Everything else sees ports only, so demo
// mode is a swapped implementation and never an `if (demo)` in feature code.
// Features reach each other only through a sibling's `index.ts` (or its
// `actions.ts`, for what must stay out of the home route); dynamic `import()`
// of a lazy page is not checked, so code splitting still works.
const adapters = {
  group: ["**/adapters/**"],
  message: "Import the port type and receive the adapter from the composition root.",
};
const paths = [
  { name: "zod", message: "Use zod/mini in app code; full zod is for tests and scripts." },
];
const siblings = {
  regex: "^\\.\\./(?!\\.\\.)[a-z0-9-]+/(?!actions$).+",
  message: "Import a sibling feature through its index",
};
const ignores = [
  "src/app/composition.ts",
  "src/adapters/**",
  "src/test/**",
  "src/**/*.test.{ts,tsx}",
];

/** @type {import("eslint").Linter.Config[]} */
export const boundaryRules = [
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores,
    rules: { "no-restricted-imports": ["error", { patterns: [adapters], paths }] },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    ignores,
    rules: { "no-restricted-imports": ["error", { patterns: [adapters, siblings], paths }] },
  },
];
