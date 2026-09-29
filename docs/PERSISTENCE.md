# Persistence

What this is: every key the app writes to browser storage, what each holds,
when it is written and cleared, and what survives a reload or a Reset demo.
Read it before adding anything that should outlast a page load, or when a
tester asks why a setting came back (or did not).

The app has no backend. The demo world (balances, transactions, positions,
agents, rooms) lives in memory and is rebuilt from the seed and start time on
every load. Only a few preferences, and one recovery mark, are written to
storage, always through the `KeyValueStorage` port
(`src/ports/storage.ts`). Nothing reads `localStorage` or `sessionStorage`
directly except the storage adapter and the pre-paint theme script in
`index.html`.

## Keys

| Key             | Where          | Shape                                                                                          | Written                                                              | Cleared                                                            |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `rhwl:v1`       | localStorage   | JSON `{ version: 1, theme: "system" \| "light" \| "dark", balancesHidden: boolean }`           | Whenever the theme or hidden balances change                         | Never by the app; replaced on the next change                      |
| `reload-once`   | sessionStorage | The string `"1"`                                                                               | When a route's code fails twice, just before the one reload it earns | On the next route that loads successfully, and when the tab closes |
| `rhwl:prefs:v1` | localStorage   | JSON `{ version: 1, currency: "USD" \| "EUR" \| "GBP", haptics: boolean, hideSmall: boolean }` | Whenever the currency, haptics or small-balance setting changes      | Never by the app; replaced on the next change                      |

`rhwl:v1` is read once at startup by `hydrate` in `src/app/persistence.ts`,
validated with a schema, and ignored if missing, unparseable or of another
shape. The inline script in `index.html` reads the same key before first
paint to apply a saved light or dark theme, so the page never flashes the
wrong theme; that script is allowed by its hash in the Content-Security-Policy
in `vercel.json`. Change the key in both places together.

`rhwl:prefs:v1` holds the display preferences added in Phase H. They live
under their own key, rather than a new version of `rhwl:v1`, so the
first-paint theme script and its CSP hash stay as they are; `hydrate` reads
and validates both keys at startup.

`reload-once` belongs to route error recovery (`src/app/chunk-retry.ts`).
After a deploy, old chunk names disappear; a page whose code fails to load is
retried once after 500 ms on the app clock, then reloads the tab once, then
shows the route's error view. The mark is what stops a second reload.

With `VITE_STORAGE=memory`, both keys go to in-memory storage instead and
nothing survives a reload.

## What survives what

| State                                                      | Reload                | Reset demo            |
| ---------------------------------------------------------- | --------------------- | --------------------- |
| Theme, hidden balances                                     | Kept (`rhwl:v1`)      | Kept                  |
| Guardrail limits, auto-lock delay                          | Lost                  | Kept                  |
| Balances, activity, positions, agents, rooms, collectibles | Rebuilt from the seed | Rebuilt from the seed |
| Onboarding done, accounts added, `.rh` name                | Lost                  | Lost                  |
| Seed, start time, frozen clock                             | From the URL          | Same as at load       |
| The reload mark                                            | Kept for the tab      | Kept                  |

Reset demo builds fresh providers from the same startup parameters and clears
every store with `session` scope. Stores with `preference` scope (theme,
hidden balances, guardrails, auto-lock) survive it; of those, only theme and
hidden balances are also written to storage. Reset demo removes no storage
key.

## Versioning a stored shape

- A stored shape carries its version in both the key (`rhwl:v1`) and the
  value (`version: 1`), and is validated with a schema on every read.
- A change that old readers could misread gets a new key (`rhwl:v2`) and a
  new literal version. Never change the meaning of a field under an existing
  version.
- A reader that finds an older version may migrate it once and write the new
  key; otherwise it ignores it and starts from defaults. Invalid data is
  never an error on screen: the app starts with defaults and overwrites the
  key on the next change.
- Adding a persisted preference means adding it to the snapshot schema,
  bumping the version, updating this file and, if it affects first paint, the
  inline script and its CSP hash.
