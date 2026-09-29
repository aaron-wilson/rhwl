// Time goes through the Clock port so presenter mode can freeze and step the whole app.
// Reuses the core no-restricted-syntax rule under its own name, so these selectors do not
// replace the design rules' selectors in files both configs cover.
import { builtinRules } from "eslint/use-at-your-own-risk";

const message =
  "Read time through the Clock port (clock.now(), clock.schedule()), not the wall clock.";

const selectors = [
  "CallExpression[callee.name=/^set(Timeout|Interval)$/]",
  "CallExpression[callee.property.name=/^set(Timeout|Interval)$/]",
  "MemberExpression[object.name='Date'][property.name='now']",
  "MemberExpression[object.name='performance'][property.name='now']",
  "NewExpression[callee.name='Date'][arguments.length=0]",
].map((selector) => ({ selector, message }));

/** Files that must run on real time, each with the reason it cannot use the demo clock. */
export const wallClockAllowed = [
  // The idle warm-up must keep prefetching while the demo clock is frozen.
  "src/app/routes.ts",
  // A long press is a gesture, measured in real time.
  "src/app/shell/useLongPress.ts",
  // Waiting for a tour target to mount is a rendering concern, not app time.
  "src/features/tour/Tour.tsx",
];

/** @type {import("eslint").Linter.Config} */
export const clockRules = {
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/adapters/**", "src/**/*.test.{ts,tsx}", "src/test/**", ...wallClockAllowed],
  plugins: { clock: { rules: { "no-wall-clock": builtinRules.get("no-restricted-syntax") } } },
  rules: { "clock/no-wall-clock": ["error", ...selectors] },
};
