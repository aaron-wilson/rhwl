# Testing

What this is: which test layers this project has, which it deliberately does
not have, how to run each one locally, and who runs what. Read it before adding
a test or a CI job. Every layer runs locally with one command and needs no
credentials, because the app has no backend and reads no environment variables.

## Layers

| Layer       | Present        | What it covers                                                                                                                                                       | Command                                            |
| ----------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Static      | yes            | Prettier, ESLint (strict type-checked rules, no `any`, no non-null `!`, no `as`, 200-line files), TypeScript strict, and a check for stub copy such as "coming soon" | `pnpm format:check && pnpm lint && pnpm typecheck` |
| Unit        | yes            | Pure logic: money math, formatters, market hours, state machines, token generation                                                                                   | `pnpm test`                                        |
| Integration | yes            | Components rendered with the real router and stores in jsdom via Testing Library                                                                                     | `pnpm test`                                        |
| Contract    | yes            | One shared spec run against every adapter behind a port, so demo and browser adapters stay interchangeable                                                           | `pnpm test`                                        |
| E2E         | yes            | User journeys through the production build in Chromium, on a phone profile (Pixel 7) and a 1440 px desktop                                                           | `pnpm test:e2e`                                    |
| Smoke       | covered by E2E | The E2E suite boots the production build with `vite preview` and asserts the app loads                                                                               | `pnpm test:e2e`                                    |

**Accessibility.** `e2e/a11y.spec.ts` runs axe (`@axe-core/playwright`, a
dev dependency) on every route, on the phone and desktop profiles. Each page
is checked four times: light and dark, gain and loss tint. Any violation
fails the test. It waits for timed animations and color transitions to
finish first, so contrast is measured on the settled page. The URLs come
from `e2e/routes.ts`, and `src/app/audited-routes.test.ts` fails when the
router gains a route that list does not have. Open sheets are checked by
`e2e/journeys.spec.ts`.

**Absent on purpose:**

- **Backend API integration** — there is no server.
- **Data-layer tests against a real database** — there is no database. The
  only persistence is a versioned snapshot in browser storage.
- **Infrastructure tests** — the deploy is a static upload to Vercel with no
  infrastructure code.

## Rules

- Everything is deterministic. The fake world is driven by a seeded random
  number generator and a controllable clock, so a flaky test is a bug in the
  test or the code it covers. Nothing is quarantined.
- Test the negative cases: invalid input, illegal state transitions, expired
  quotes, insufficient balance.
- E2E never waits on the wall clock. Timed moments are reached by stepping
  the demo clock (`?freeze=1`, `?step=`, or the `?presenter=1` bar).
  `scripts/check-e2e.ts`, run by `pnpm lint`, fails on `waitForTimeout(` or
  a `timeout:` above 10,000 ms anywhere under `e2e/`.
- Derive cases from the source where possible. For example, the token tests
  enumerate the token data, so a new token is covered with no test edit.

**Suite size at the final gate.** `pnpm test:coverage` runs 115 files and
1401 unit tests. `pnpm test` runs 116 files and 1403 tests: the extra file
holds the timing tests, which coverage instrumentation would slow down.
`pnpm test:e2e` lists 290 tests, 145 on each of the phone and desktop
projects; two are desktop-only and skip on the phone, so 288 run.

## Commands

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test          # unit, integration, contract (Vitest, jsdom)
pnpm test:coverage # the same, with the coverage floor on src/domain and src/lib
pnpm test:e2e      # builds, serves on port 4173, runs Playwright
```

E2E needs Playwright's Chromium. On a new machine, install it once with
`pnpm exec playwright install chromium`. The HTML report is written to
`playwright-report/`, and traces for failed tests to `test-results/`.

## Who runs what

- **Agent:** every layer above, on every commit, with real output in the
  handoff.
- **Operator:** a manual pass on a real phone (Safari on iOS, Chrome on
  Android) after each deploy. The sandbox cannot drive physical devices.
