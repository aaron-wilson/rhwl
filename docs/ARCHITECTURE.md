# Architecture

What this is: what exists in the wallet prototype and how the pieces behave
together. Read it before adding a feature, a port or a store. The app is a
static single-page app with no backend: every price, balance and transaction
comes from a deterministic fake world running in the browser, reached through
the same interfaces a real wallet would use.

## Layers

```
src/
  tokens/     design tokens (TypeScript), the only source of colors, sizes, motion
  domain/     pure logic, no I/O: money, market hours, tx and onboarding machines,
              keys, send, swap, bridge, fees, trade, perps, earn, launch curves,
              rug radar, cost basis
  ports/      interfaces for everything outside the app: clock, storage, haptics,
              share, clipboard, visibility, market, chain, simulation, demo controls
  adapters/   implementations of the ports: demo/* (simulated) and browser/* (real)
  data/       the fake world's catalog: chains, assets, accounts, genesis, history
  lib/        small generic helpers: store, channel, cached source, PRNG
  features/   one folder per feature; UI plus the feature's own state
  ui/         presentational primitives (Button, Sheet, ListRow, ...)
  app/        composition root, session, router, shell, startup, persistence
```

Dependencies point inward. `domain` imports nothing but itself and `data`.
Features import port types, never adapters; a lint rule allows adapter imports
only in `src/app/composition.ts`, in adapters themselves and in tests.

## Ports and adapters

Every outside dependency is an interface in `src/ports`. `Providers` bundles
them:

| Port            | Demo adapter                                                    | Browser adapter               | Default   |
| --------------- | --------------------------------------------------------------- | ----------------------------- | --------- |
| Clock           | steerable virtual clock (start at any instant, freeze, advance) | real time                     | demo      |
| KeyValueStorage | in-memory                                                       | localStorage                  | browser   |
| Haptics         | records what would buzz                                         | Vibration API where supported | browser   |
| Share           | records what was shared                                         | share sheet, else clipboard   | browser   |
| Clipboard       | records what was copied                                         | Clipboard API                 | browser   |
| Market          | seeded, deterministic prices                                    | none                          | demo      |
| Chain           | in-memory ledger with latency                                   | none                          | demo      |
| Simulation      | dry run against the demo ledger                                 | none                          | demo      |
| DemoControls    | fail the next transaction, advance the clock                    | none                          | demo only |

Market, chain and simulation have no production adapter in this prototype.
One shared contract spec per port runs against every adapter, so a future
real adapter must pass the same tests.

`src/app/composition.ts` is the only place that chooses adapters, from
`VITE_*` environment variables parsed once in `src/config/env.ts`.

## The demo world

- **Seed and time.** `?seed=`, `?at=`, `?scenario=`, `?freeze=1`, `?step=`
  and `?presenter=1` are read once at startup. `?step=PT8S` (an ISO duration
  of days to seconds, or plain milliseconds) advances a frozen clock once
  after mount; `?presenter=1` shows a bar that steps the clock by 5 s, 1 h or
  1 d, and "Now", which lets a frozen clock run live from where it stands. The same seed and time always produce the same prices,
  transaction hashes and charts.
- **Market.** A price is the catalog's anchor price times
  `exp(noise(t) − noise(anchor))`, with noise built from five smooth octaves
  seeded per asset. Stock tokens move less while NYSE is closed. New York time
  is computed once per UTC hour and price series are memoized, so a week of
  prices for a whole portfolio takes about 15 ms.
- **Chain.** Starts from genesis balances plus three confirmed past
  transactions. A submitted transaction is accepted after 350 ms and confirmed
  1.4 s later on the app clock; it fails if funds are short at confirmation or
  if a failure was requested through DemoControls.

## State

- **Stores** (`src/lib/store.ts`): small observable values outside React, read
  with `useStore`. Each has a scope. `session` stores (transactions, toasts,
  active account) are cleared by Reset demo; `preference` stores (theme,
  hidden balances) survive it; the `app` store holds the session's providers.
  Tests reset every store after each test.
- **Persistence.** Only preferences persist, as a versioned, schema-validated
  snapshot under `rhwl:v1`. An inline script in `index.html` applies the saved
  theme before first paint; the Content-Security-Policy allows it by hash.
- **Session.** `createSession` owns the providers. Reset demo builds fresh
  providers from the same startup and clears session stores.

## A transaction, from tap to balance

```
feature builds a TxRequest (summary, deltas, fee, counterparty)
  → runTransaction
      simulation.simulate      → findings; blocked if it would fail
      signer (passkey sheet)   → shows the dry run; approve or reject
      chain.submit             → hash after the accept latency
      chain.settle             → confirmed or failed after the confirm latency
      every step moves the tx state machine (domain/tx/machine.ts)
      every step publishes on txEvents
  → useHoldings shows chain balances plus in-flight effects (optimistic),
    which disappear on failure (rollback)
  → subscribers react: toasts and haptics (tx-feedback), the pending island,
    Activity
```

Signing is chosen per account. `SignerHost` puts a signer in `signerStore`
while the app is mounted: the passkey sheet for ordinary accounts, and the
same sheet in "Confirm on device" mode for hardware accounts. Tests and
scripts use `approveEverything`. A signer may answer with a different fee
(see Gas in anything below), and the request is simulated again with it.
When the app locks, a pending signature is refused.

Messages are signed the same way, without a dry run or fee: `signMessageAs`
asks `signerStore.approveMessage`, which opens the message sheet (or "Confirm
on device"), then signs with the account's demo key as EIP-191
`personal_sign` over secp256k1. `verifyMessage` recovers the signer's address
from the signature. The curve code loads only when something is signed.

Before the signature, every transaction passes one spending policy from
`policyStore`: a pure function of the request, the account and the time that
allows it, blocks it with reasons (shown like a failed dry run, never
signed), or delays it until a time on the app clock. The default allows
everything.

Amounts never travel as text. A transaction's title is a structured summary
(verb, amount, detail) rendered through `txTitleText`, which drops the amount
while balances are hidden.

## Features and where their state lives

A feature imports a sibling only through that sibling's `index.ts`, which
exports exactly what siblings use today. `transactions` has a second entry,
`actions.ts` (`runTransaction`, `signMessageAs`, the network fee), so the
home route, which only reads balances, never loads the sending code. A lint
rule rejects any other path into a sibling ("Import a sibling feature
through its index"). Tests, and code outside `src/features`, may import a
feature's files directly; a lazy page's dynamic `import()` also stays a
direct path so it keeps its own chunk.

Every feature below keeps its own state in a store from `src/lib/store.ts`
(session scope, so Reset demo restores it), calls pure functions in
`src/domain`, and moves money only through `runTransaction`.

- **Onboarding.** A state machine (`domain/onboarding/machine.ts`) runs the
  welcome flow: splash, passkey or recovery phrase or import, `.rh` name,
  region. Phrases are checked against BIP-39 with `crypto.subtle` SHA-256
  and never leave component memory. The word list loads lazily.
- **Accounts and lock.** `accountsStore` holds accounts (rename, reorder,
  hide, hardware pairing); `activeAccountStore` is the one active account
  every screen reads. The lock screen replaces the whole app after idle or
  background time measured on the app clock, through the Visibility port.
- **Asset pages.** Chart, stats and position. Cost basis is average cost
  from the account's history (`domain/portfolio/cost-basis.ts`). Stock
  tokens add the market clock (listing state, countdown, premium to last
  close) and the multiplier timeline.
- **Collectibles.** `collectiblesStore` holds items and spam verdicts
  (`domain/collectibles/spam.ts` gives reasons). Burn is a signed
  transaction.
- **Receive and Send.** Receive builds EIP-681 and Solana Pay links for the
  QR. Send resolves `.rh` and `.eth` names, checks EIP-55 checksums, warns
  about lookalikes of past recipients (address poisoning), and keeps the
  fee back when Max is used.
- **Swap.** Three fictional venues on a constant-product model
  (`domain/swap/routes.ts`) give price impact and minimum received after
  slippage. A quote reducer (`domain/swap/quote.ts`) runs
  `idle → quoting → fresh → stale`: a quote lasts 15 s, and a stale quote cannot be
  signed.
- **Bridge.** A two-leg machine (`domain/bridge/machine.ts`):
  `source_pending → relaying → arrived | failed`. The user signs the source
  leg; the relay delivers the destination leg on the app clock with no
  signature. Refuel spends $3 of the transfer on destination gas.
- **Robinhood account rail.** A simulated brokerage account. Deposits are
  sent by the custodian, so the wallet signs nothing; withdrawals are
  ordinary signed sends. The page shows custodial and self-custody balances
  side by side: the custody boundary.
- **Gas in anything.** `feeOptions` offers a speed, ETH, USDG or a held
  Stock Token through a paymaster at a 10% premium
  (`domain/fees/gas.ts`), and three sponsored transactions per session.
- **Trade.** Stock tokens are bought and sold against USDG in dollars or
  shares through the multiplier (`domain/trade/order.ts`), with a gap
  notice while the listing is closed.
- **Perps.** Positions (`perpsStore`) are opened by a signed collateral
  transfer. P&L, liquidation at 0.5% maintenance margin and funding per
  8-hour period are pure (`domain/perps/position.ts`). `watchPositions`
  liquidates and fires take-profit or stop-loss orders on each clock tick,
  without a signature, while the Perps page is mounted.
- **Earn.** A USDG vault (`vaultStore`) growing at principal ×
  1.07^(t / year), recomputed on every tick and compounded on each deposit
  or withdrawal.
- **Launch.** Every launch has a constant-product bonding curve on virtual
  reserves (`domain/launch/curve.ts`); 800M of 1B tokens sell on the curve.
  A buy that fills it spends only what that costs and graduates the token.
- **Rug Radar.** A fixed scoring table over six factors
  (`domain/memes/rug-radar.ts`): 100 minus penalties, graded A to F, with
  every factor's verdict shown.

Each Phase F feature below says what it reads, what state it owns, what it
writes through, and which code chunk it loads in. "Session" stores are
cleared by Reset demo; "preference" stores survive it but not a reload.

- **Pair Lens.** A held meme's P&L split in two. Cost basis carries a shadow
  position: each arrival's dollars also "buy" the meme's quote asset (or an
  equal-weight index of a basket quote) at its price then. Beta is what that
  shadow made; alpha is the rest, so the two always add up to the total
  (`domain/pair-lens.ts`). _Reads_ the account's position history, the
  catalog's pairings and market prices. _Owns_ nothing: every number is
  derived on render. _Writes_ nothing. _Chunk:_ part of the asset page's
  chunk; on Home, `PairLensSummary` is a lazy card of about 0.9 KB.

- **Tendies Index.** A basket by weight (math in `domain/basket`). A buy or
  rebalance is one transaction whose `legs` the sign sheet lists; their
  effects are merged into `deltas`, so the chain applies every leg or none.
  Weights are whole basis points summing to 10,000, and the last leg takes
  the rounding remainder. _Reads_ holdings of each member and market prices.
  _Owns_ the basket's members and weights in `basketStore` (session).
  _Writes_ through `runTransaction`, one batch per buy or rebalance. _Chunk:_
  the `/tendies` route (`TendiesPage`), reached from Trade.

- **Positions or Ban.** A gain/loss card (`domain/flex/card.ts`) is stable
  JSON, versioned and schema-checked, signed with `signMessageAs`. The verify
  link carries the signed text (base64url) and the signature, so `/verify`
  re-checks a card with no wallet state: the signature must recover to the
  signing address of the account the card names. With balances hidden, the
  dollar figure is left out of what is signed. _Reads_ the position and its
  cost basis. _Owns_ nothing beyond the open sheet's state. _Writes_ through
  `signMessageAs` (the message sheet), then the Share port, or
  `downloadBlob` for the PNG where sharing files is unavailable. _Chunk:_ the
  flex sheet is a lazy chunk opened from the asset page; `/verify` is its own route
  (`VerifyPage`), and the curve code loads only when something is signed or
  verified.

- **Guardrails.** The user's own limits fill the spending policy: a weekly
  meme budget over a rolling seven days, a leverage cap on new perps, a pause
  after three losing trades in a row, and a wait before big trades
  (`domain/policy/guardrails.ts`). Facts come from the chain's history and
  the market; a close or sale records its realized P&L so losses can be
  counted. Selling and closing are never held. A held transaction publishes
  `held` on `txEvents`, which shows the reasons. _Reads_ the chain's history
  and market prices, through `facts.ts`. _Owns_ the limits in
  `guardrailsStore` (preference). _Writes_ the policy into `policyStore` once
  at session start (`register.ts`); it never submits anything itself.
  _Chunk:_ the `/guardrails` route (`GuardrailsPage`), reached from Settings;
  on Home, `GuardrailsStatus` is a lazy budget ring.

- **Agent Mode.** A prompt is parsed by a fixed grammar (`domain/agent`), with
  no model and no network, into a rule: a recurring or conditional buy, a
  take-profit, or a rebalance. The user signs the rule's scope as a message,
  which grants a session key. The runner (`runner.ts`) schedules each key on
  the app clock and signs as the agent only while the key still covers the
  action (asset, direction, per-run amount, total cap, expiry, not revoked).
  Guardrails apply to the agent like any trade. The kill switch revokes every
  key and cancels its timer. _Reads_ holdings, prices and the clock. _Owns_
  keys and the activity feed in `agentStore` (session). _Writes_ through
  `signMessageAs` for the grant and `runTransaction` for each run. _Chunk:_
  the `/agent` route (`AgentPage`), reached from Trade.

- **What-if slider.** One control (`WhatIfSlider`) on the perp, stock-token,
  meme and basket review surfaces: a −30% to +30% price shock, recomputed on
  every move from `domain/whatif.ts`, which reuses the perps liquidation rule
  and basket drift math. A paired meme is assumed to hold its pair, and says
  so. _Reads_ the order or position under review and its prices. _Owns_ only
  the slider's value in component state. _Writes_ nothing. _Chunk:_ none of
  its own; it loads with whichever review surface renders it (Perps, the
  trade sheet, the curve buy sheet, Tendies, earnings night).

- **Ticker Rooms.** One room per Stock Token, reached from its page. A
  holder proves it by signing a message (`signMessageAs`); a non-holder sees
  the gate. The badge comes from how long the current holding has lasted
  without selling out (`domain/rooms`). Messages are scripted and
  deterministic from the ticker and time, arriving in 90-second slots on the
  app clock, and the sentiment gauge is their bullish share. _Reads_ holdings,
  position history and the clock. _Owns_ the rooms the account has joined in
  `joinedStore` (session). _Writes_ through `signMessageAs` on join. _Chunk:_
  the `/rooms/:slug` route (`RoomPage`).

- **Earnings Sweat Mode.** A calendar of upcoming reports for held Stock
  Tokens and for stocks that held memes are paired to (`domain/earnings`).
  Earnings night runs from the 4:00 PM ET close to the next 9:30 AM open.
  The night view shows the on-chain price after hours and everything riding
  on the stock (token, paired memes, signed perp size) with the what-if
  slider. _Reads_ holdings, open perp positions, pairings, prices and the
  clock (`useEarnings`). _Owns_ nothing. _Writes_ nothing. _Chunk:_ the
  `/earnings` and `/earnings/:slug` routes; on Home, `EarningsCard` is a lazy
  card shown for tonight's report or the next one within a week.

- **Tax lots.** FIFO lots per asset (`domain/portfolio/lots.ts`) built from
  the same position history as average cost (`positionChanges`). Asset pages
  keep average cost; the tax page shows realized and unrealized P&L by lot
  and exports RFC 4180 CSV with exact decimals. _Reads_ the position history
  and prices (`useLotBooks`). _Owns_ nothing. _Writes_ the CSV through the
  Share port where it can take files, and `downloadBlob` everywhere else.
  _Chunk:_ the `/tax` route (`TaxPage`).

- **dApp browser.** Fictional sites (`data/dapps.ts`): a DEX, a lending
  market and a launchpad, each on its own network, plus an unlisted phishing
  clone of the DEX that only its address reaches. `/browse` is the start page
  with an address bar; `/browse/:id` renders the site inside the wallet's
  frame. The connect sheet picks an account (never a watch-only one), shows
  the site's network, switching to it when it is not Robinhood Chain, and
  lists what the site may ask for. A connected site can read the account's
  USDG balance (masked while balances are hidden) and nothing more until
  signing requests arrive. `/connected-sites` lists every connection with
  its account and network, and disconnects one or all. _Reads_ accounts and
  holdings. _Owns_ connections in `connectionsStore` (session, so a reload or
  Reset demo disconnects everything). _Writes_ nothing else. _Chunk:_ the
  `/browse`, `/browse/:id` and `/connected-sites` routes, reached from
  Settings.

- **Signing requests (domain).** A site's request is validated at the edge
  (`domain/requests/request.ts`: `eth_sendTransaction`, `personal_sign`,
  `eth_signTypedData_v4`) and decoded into an intent
  (`domain/requests/intent.ts`): a token transfer, an approval (limited or
  unlimited, from 2^128 up), approval of a whole collection, a contract call,
  a readable or blind message, a Permit, or other typed data. Transaction
  intents become a `TxRequest`, so the same dry run from `runTransaction`
  produces the unlimited-approval, known-drainer and unverified-contract
  findings; `domain/requests/risk.ts` adds what a dry run cannot see: the
  lookalike-domain check and the findings a signature carries. Findings are
  merged one per kind, worst first.
- **Site requests (G2b).** A connected site's buttons send raw requests
  (`data/dapp-actions.ts`, seeded so each finding has one). `askSite`
  validates the request, refuses anything beyond the connection's
  permissions ("transact" or "sign"), and then either runs a transaction
  through `runTransaction` with a signer wrapper that adds the site and
  signature findings to the dry run's, or signs a message through
  `signMessageAs`. Both sheets show "Requested by" the site and the
  findings. A lookalike site is replaced by a full-screen block: leaving is
  one tap, while staying takes opening "I know the risk", ticking a box and
  pressing "Proceed anyway", remembered for the session (`proceededStore`).

- **Approvals manager.** Every allowance the accounts have granted, across
  Robinhood Chain, Ethereum, Arbitrum and Base (`data/approvals.ts` seeds
  six), plus any a site is granted through a confirmed approve request.
  `domain/approvals/risk.ts` rates each: a drainer spender is dangerous; an
  unverified spender, or an unlimited grant left 180 days, is risky; the
  reasons are listed. "Select risky" picks every non-fine row, and revoking
  is one transaction with a leg per approval, so one signature and the usual
  lifecycle; rows go only when it confirms. _Reads_ the clock. _Owns_
  `approvalsStore` (session). _Writes_ through `runTransaction`. _Chunk:_
  the `/approvals` route, reached from Settings.

- **Security center.** A score out of 100 from six weighted checks
  (`domain/security/checks.ts`): backup verified this session (20), signs
  with a passkey or device (15), app lock on (15), guardrails set (15), no
  risky approvals (20), and poisoned addresses flagged (15). The poisoning
  log (`domain/security/poison.ts`) lists zero-value receipts from addresses
  that imitate someone the account has sent to. Each gap has a one-tap fix:
  a passkey signature proves the backup, switch to a signing account, lock
  after 5 minutes, set a meme budget and leverage cap, revoke the risky
  approvals in one signature, or flag the lookalikes as scams. The score
  counts up over the draw duration and its bar grows by transform; with
  reduced motion both jump. _Reads_ accounts, the lock setting, guardrails,
  approvals and chain history. _Owns_ `backupVerifiedStore` and
  `flaggedStore` (session). _Writes_ through `signMessageAs`,
  `runTransaction` and the stores it fixes. _Chunk:_ the `/security` route,
  reached from Settings.

- **Inbox.** Notifications in `inboxStore` (session): fills and swaps as
  they confirm (from `txEvents`), bridge arrivals, every agent outcome, the
  market opening, and a reminder an hour before the close on the day a held
  stock reports, all timed on the app clock. The watcher (`inbox/watch.ts`)
  loads after first paint, so it costs the home route nothing. A bell with
  the unread count sits in the sidebar and, on phones, on Home; the shell
  builds the bell once and hands it to Home through the outlet context
  (`app/shell/slots.ts`), because importing it from both the shell and the
  Home chunk split React into extra chunks and cost 2 KB. Opening `/inbox`
  marks everything read. Amounts stay in each item's summary, so hidden
  balances stay hidden.

- **Price alerts.** Each asset page has an alerts card: rises above or falls
  below a dollar price. An alert can only be set, or re-armed, while the
  price is on the other side of it (`domain/alerts/alert.ts`), so it never
  fires the moment it is made. The inbox watcher checks armed alerts every
  5 s of app time; one that crosses fires once, lands in the inbox and is
  disarmed until the user re-arms it. _Owns_ `alertsStore` (session).
  _Chunk:_ the card loads with the asset page; the checking lives in the
  lazy watcher.

- **Settings.** Four sections. Display: theme, currency (USD, EUR or GBP,
  converted in the formatters at fixed demo rates), hide balances, hide
  balances under $1 on Home, haptics; all preferences, persisted. Security:
  auto-lock and links to tax lots, Apps, Security, Approvals, Connected
  sites and Guardrails. Networks: the built-in networks and a form to add
  one by hand, validated field by field (`domain/networks/custom.ts`), kept
  for the session and never contacted. About: the honesty statement and
  Reset demo behind a confirmation. Reset demo is the one existing path
  (`session.resetDemo`); a test proves every session store is back at its
  initial value (`changedStores("session") === 0`) and the chain matches a
  fresh one.

- **Command palette.** ⌘K or Ctrl-K, from any page in the shell, opens a
  searchable list of every page (`app/destinations.ts`), every asset, each
  Stock Token's room and earnings night, each collectible and site, the
  theme, currency and privacy settings, and every scenario (which reloads
  into it). Every word typed must start a word of a command; title matches
  rank first (`domain/palette/search.ts`). A test checks the commands
  against the router's own table, so every route stays reachable. The key
  listener lives in the shell; the list itself loads on first use. Three
  typed actions open their screen filled in, never signed from the
  palette: "send 20 USDG to you.rh", "swap ETH for USDG", "buy NVDA"
  (`domain/palette/actions.ts`). "?" opens the keyboard shortcuts sheet, and
  a search button beside the inbox bell opens the palette without a
  keyboard.

- **Presenter mode.** Hidden until wanted: ⌘. or Ctrl-., a 600 ms press on
  the sidebar logo, the palette, or `?presenter=1`. A sticky strip gives a
  scenario switcher (each scenario is one step: a fresh load at its moment
  and seed, presenter mode kept), the clock steps, and, on desktop, a phone
  frame: the app itself in a 390 × 844 iframe (`?frame=1` inside), because
  layout follows the viewport and a smaller container would still show the
  desktop layout. The deploy allows framing by its own origin only.
  `presenterStore` has app scope, so Reset demo keeps it on.
- **Guided tour.** Nine stops (`features/tour/steps.ts`), one per feature
  only this wallet has, in pitch order. Each stop opens its page, waits for
  its element, scrolls it into view and frames it with a soft spotlight
  (the scrim token as a spread shadow), with a card to go back, on, or out.
  Every target is an element that is always on its page, whatever the
  account's state, so the tour cannot dead-end; an E2E walks all nine and
  checks each target was found. Started from the presenter bar or the
  palette; the tour code loads when it starts.

## Performance guards

- `pnpm build` fails when the home route's initial JavaScript exceeds 180 KB
  gzip. `motion` loads only with components that need springs or drag.
- Work done on a tap has a time budget measured in unit tests; the first one
  covers building a portfolio's price series.
- `pnpm perf` measures LCP, INP and chart-scrub frame rate on a throttled
  phone profile and fails above the quality bars (docs/TESTING.md,
  Performance). Home ships in the entry bundle, and the other tabs are warmed
  once the page is idle.
