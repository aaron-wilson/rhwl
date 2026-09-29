# Wallet — a Robinhood Chain wallet prototype

A responsive, fully static web prototype of a self-custody wallet built for
Robinhood Chain: Stock Tokens that trade around the clock, crypto, memes and
collectibles in one place, with every flow walked end to end on simulated data.

It is an independent portfolio piece. It is not affiliated with Robinhood, uses
no Robinhood logos, and makes no network calls: every price, balance, name and
transaction comes from a deterministic fake world running in the browser.

## Try it

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Node 22 or newer and pnpm 10 are required. No environment variables are
needed; `docs/ENV_VARS.md` lists the optional ones.

Links open the demo at a chosen moment, so a story can be shared as a URL:

| Link                                                  | What it shows                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `/?scenario=green-day`                                | A portfolio up on the day                                        |
| `/?scenario=red-day`                                  | A down day; the whole app tints red                              |
| `/?scenario=weekend-gap`                              | Saturday: the listing is closed, Stock Tokens trade at a premium |
| `/?scenario=earnings-night`                           | An earnings night after the close, with Sweat Mode on Home       |
| `/?scenario=meme-mania`                               | 10 pm ET: the listing is shut, memes and perps keep trading      |
| `/?scenario=fresh-install`                            | First run: splash, passkey or recovery phrase, `.rh` name        |
| `/?presenter=1`                                       | The presenter bar: scenarios, clock steps, phone frame, tour     |
| `/?seed=abc&at=2026-10-05T14:00:00Z&freeze=1`         | Any seed, any instant, clock frozen                              |
| `/agent?at=2026-10-02T14:59:52Z&freeze=1&presenter=1` | A frozen clock with presenter buttons to step it                 |
| `/styleguide`                                         | Tokens, components and transaction triggers                      |

## What works

- **Home:** portfolio chart across six ranges with scrubbing, holdings grouped
  by kind, a Weekend Gap radar while markets are closed, collectibles.
- **Asset pages:** price chart, key stats, your position with cost basis and
  unrealized profit or loss, and for Stock Tokens a market clock and the
  dividend "drip" (shares per token over time).
- **Move money:** receive with QR codes per network and request links; send to
  an address, a `.rh` or `.eth` name, with EIP-55 checksum validation and an
  address-poisoning warning; swap with live routes and an expiring quote;
  bridge in and out of Robinhood Chain with a two-leg timeline; move cash and
  crypto to and from a linked Robinhood account.
- **Trade:** buy and sell Stock Tokens around the clock by dollars or shares,
  with a gap notice while the listing is closed; USDG-margined perps with
  leverage, liquidation price, take-profit and stop-loss; a USDG vault that
  earns by the second.
- **Launch:** a feed of fictional stock-paired and ETH-quoted launches with
  filters, bonding-curve buys and sells, and a graduation moment when a curve
  fills; every meme gets a Rug Radar grade from A to F with the reason behind
  each factor.
- **Fees:** pay network fees in ETH, USDG or any held Stock Token, choose a
  speed, or use a sponsored transaction.
- **Every transaction** is simulated before signing, signed with a passkey
  sheet (or on a paired Ledger), shown in a pending island, and lands in
  Activity; failures roll balances back.
- **Accounts and safety:** multiple accounts, hardware pairing, auto-lock,
  hidden balances everywhere, spam detection for collectibles.

**Signature features.** Pair Lens splits a stock-paired meme's profit into
the stock's move and the meme's own. The Tendies basket buys a weighted mix
of Stock Tokens, crypto and memes in one signature and rebalances in one
more. A flex card puts a gain or loss on a shareable image whose numbers are
signed by the wallet, and `/verify` checks the signature cold from the link.
Guardrails hold trades that break your own limits: a weekly meme budget, a
leverage cap, a cool-off after losses and a "sleep on it" delay. Agent Mode
turns a plain-English rule into a policy card and a scoped session key with a
kill switch. A What-if slider on every review sheet shows a price shock's
effect. Ticker Rooms are holder-gated chats joined by signing. Earnings Sweat
Mode gathers everything exposed to a stock on its earnings night. Tax lots
are worked out first in, first out, with a CSV export.

**Security and dApps.** A dApp browser opens three fictional sites; connect
picks the account and network. Each site request gets a review sheet with
risk findings from a dry run, and the lookalike clone gets a full-screen
phishing block with a deliberate proceed path. Connected sites can be
disconnected one by one or all at once. Approvals lists every allowance with
its risk and supports batch revoke in one signature. The security center
scores the wallet and fixes each weak spot in one tap.

**Polish.** An inbox with a bell collects fills, arrivals, agent outcomes and
market reminders; price alerts fire into it. Settings cover display currency
(USD, EUR, GBP), networks with a validated custom RPC form, About and Reset
demo. A command palette (⌘K or Ctrl-K) finds any page, asset or setting and
runs typed actions such as `send 20 USDG to stonks.rh`. Presenter mode (⌘. or
Ctrl-.) switches scenarios, steps the clock and shows the app in a phone
frame, and a guided tour walks the unique features in nine stops.

`PLAN.md` holds the full feature plan and the progress table.

## Demo

`OPERATOR_CHECKLIST.md` is the script for showing the deployed prototype:
what to open, what to click, what appears and what to say at each step.

## Checks

```bash
pnpm lint && pnpm typecheck   # strict TypeScript, design and boundary lint rules
pnpm test                     # unit and component tests (Vitest)
pnpm test:e2e                 # end-to-end on phone and desktop (Playwright)
pnpm build                    # fails if Home's initial JavaScript exceeds 180 KB gzip
```

## Stack

Vite, React 19, React Router, TypeScript (strict), Tailwind CSS v4 driven by
generated design tokens, `motion`, `lucide-react`, `qrcode-generator`, `zod`
`@noble/hashes` and `@noble/curves`. Tests use Vitest, Testing Library,
Playwright, `@axe-core/playwright` for accessibility and `@vitest/coverage-v8`
for the coverage floor.

## License

MIT, in `LICENSE`.
