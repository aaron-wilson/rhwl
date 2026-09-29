# Design

What this is: how the wallet prototype looks, moves and feels, and the rules
that keep it that way. Read it before building or changing any screen. The
visual design is original to this prototype. It borrows the calm of Apple's
apps and the market-driven color of a trading app, and it never reproduces
Robinhood's logo, feather or wordmark.

## Principles

1. **Content first, chrome quiet.** A neutral warm-gray base does 90% of the
   work. Color comes from the market (gain and loss) and from content (token
   icons, sector chips, launch cards), never from bars, borders or panels.
2. **The market sets the mood.** The whole app takes a faint gain or loss tint
   from the portfolio's performance over the selected range. The chart line,
   the primary button, the active tab and a soft wash at the top of the page
   change together. It is the one bold idea; everything else stays calm.
3. **Speed is a design feature.** Every tap acknowledges within 50 ms. Writes
   are optimistic and roll back visibly on failure. Skeletons match the final
   layout, so nothing jumps when data arrives.
4. **Numbers are the heroes.** Balances and prices use tabular figures, large
   sizes and per-digit roll animations. Labels step back.
5. **Honest by default.** The About screen and the presenter overlay say this is
   an independent prototype with simulated data.

## Tokens

Every value lives in TypeScript under `src/tokens/`. `pnpm tokens` generates
two committed files from it:

- `src/styles/tokens.css` — CSS custom properties prefixed `--rh-`, for both
  themes and both tints.
- `src/styles/theme.css` — the Tailwind v4 theme mapping. Tailwind's default
  theme is never imported, so only token utilities exist: `bg-blue-500` or
  `p-7` generate nothing.

A test fails if either file drifts from the source. A lint rule rejects hex
codes, color functions, raw palette utilities and arbitrary pixel or duration
values in feature code. The token source is the only exception. The committed
brand SVGs under `brand/` bake their colors in, as supplied artwork does.

The `/styleguide` route renders every token from the token data, in both
themes side by side, with a tint switch and the measured contrast ratio beside
each pair. A new token appears there without editing the page.

## Color

**Roles, not colors.** Feature code names a role and the theme supplies the
value.

| Role                                 | Use                                            |
| ------------------------------------ | ---------------------------------------------- |
| `canvas`                             | Page background                                |
| `surface`                            | Cards, sheets, list rows                       |
| `surface-2`                          | Grouped and sunken areas, inputs               |
| `line`, `line-strong`                | Hairline borders and dividers                  |
| `ink`, `ink-2`, `ink-3`              | Primary, secondary and tertiary text           |
| `gain`, `gain-soft`, `on-gain`       | Up moves: text, chip background, text on solid |
| `loss`, `loss-soft`, `on-loss`       | Down moves, same three uses                    |
| `accent`, `accent-soft`, `on-accent` | Aliases that follow the market tint            |
| `live`, `live-soft`, `on-live`       | Pending transactions, streaming, the agent     |
| `warn`, `warn-soft`                  | Caution text and banners                       |
| `focus`                              | Focus rings                                    |
| `scrim`, `chrome`                    | Behind sheets; translucent bars under blur     |

**Market tint.** `accent`, `accent-soft` and `on-accent` resolve to the gain
roles by default and to the loss roles inside `data-tint="loss"`. Set the
attribute on the root to tint the whole app, or on any element to tint a
subtree. Use `accent` for anything that should follow the market; use `gain`
or `loss` directly for a number whose sign is fixed.

**Splash colors** (`splash-sky`, `-violet`, `-pink`, `-orange`, `-amber`,
`-teal`, `-lime`, `-blue`) are for content only: token monograms, sector chips
and launch cards. They are never used for buttons, bars or borders.

**Contrast.** Every text pair in the contrast list meets WCAG AA (4.5:1) in
both themes, and the focus ring meets 3:1 against the canvas. Every splash
color meets 4.5:1 as text on a surface and on its own soft chip (14% of the
color mixed into the surface). A test enumerates the pairs from the
token data, so a new pair is covered with no test edit.

## Themes

Light and dark are both first-class. The OS setting decides by default. An
explicit choice sets `data-theme="light"` or `data-theme="dark"` on the root
and wins in both directions. Every color is defined for light at the root, so
no color exists only inside a media query or a theme block. Theme blocks also
match nested `[data-theme]` elements, which is how the styleguide shows both
themes on one page.

## Type

The system font stack, SF Pro first, so a clean checkout needs no network and
Apple devices get their native face. Three weights only: regular 400,
semibold 600, bold 700.

| Token      | Size / line | Tracking | Example                   |
| ---------- | ----------- | -------- | ------------------------- |
| `display`  | 56 / 60     | -0.03em  | Portfolio total           |
| `large`    | 44 / 50     | -0.025em | Asset ticker on its page  |
| `title1`   | 32 / 38     | -0.02em  | Page titles               |
| `title2`   | 24 / 30     | -0.016em | Section titles            |
| `title3`   | 20 / 26     | -0.012em | Card titles               |
| `headline` | 17 / 24     | -0.01em  | Row titles, button labels |
| `body`     | 15 / 22     | -0.005em | Body copy                 |
| `footnote` | 13 / 18     | 0        | Metadata                  |
| `caption`  | 12 / 16     | 0        | Fine print                |

Tracking tightens as size grows. Any number that can change uses
`tabular-nums` so digits do not shift.

## Space, radius, depth

- **Space** is a 4 px grid: 0, 1, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80,
  96 px, as utilities `p-0`, `p-px`, `p-1` through `p-24`. Prefer generous
  space over density; a list row is at least 56 px tall.
- **Radius:** `xs` 6, `sm` 10, `md` 14, `lg` 20, `xl` 28, `full` for pills.
  Cards use `lg`, sheets `xl` on their top corners, inputs and chips `md` or
  `full`.
- **Shadows** are large, soft and nearly transparent (`sm`, `md`, `lg`). In
  dark mode, depth comes mostly from lighter surfaces and hairlines.
- **Blur** (`backdrop-blur-chrome`, 20 px) is budgeted to exactly three
  surfaces: the tab bar, the sheet scrim and the pending-transaction island.
- **Layers** (`layer-base` → `layer-toast`) name the stacking order: sticky
  headers, navigation, scrim, sheet, island, toast.

## Motion

- **Durations:** `fast` 150 ms, `base` 200 ms, `slow` 250 ms for state changes;
  `draw` 600 ms only for the one-time chart reveal.
- **Easing:** `standard` for most transitions, `spring` (slight overshoot) for
  things that arrive, `exit` for things that leave.
- Animate **transforms and opacity only**, never layout properties.
- Sheets slide up and follow the finger when dragged; lists reorder smoothly;
  numbers roll per digit; the chart draws in once and then scrubs at 60 fps.
- **Parallax** appears once, on the onboarding splash: background layers move
  slower than the headline.
- **Reduced motion:** with the OS setting on, every transition and animation
  becomes instant. A global rule enforces it, so no component can forget.

## Focus and accessibility

- Every interactive element shows a 2 px `focus` ring, offset 2 px, on
  keyboard focus. It is never removed.
- Everything works by keyboard, including sheets and the chart scrubber.
- Content that changes under the user — balances, quotes, transaction status —
  is announced with `aria-live`.

## Brand

- **The mark:** a rounded tile holding a rising price line that ends in a live
  dot. In the app it follows the theme (ink tile) and the market tint (line
  and dot). As a favicon and app icon it is a near-black tile with a gain-green
  line.
- **The wordmark:** the word "Wallet" in the system font, semibold, beside the
  mark. There is no custom logotype.
- **Sources:** `brand/mark.svg` (rounded) and `brand/mark-full-bleed.svg`
  (square, for iOS and maskable icons). `pnpm icons` renders them to
  `public/favicon.ico`, `public/apple-touch-icon.png` and the manifest icons,
  which are committed.

## Primitives

All live in `src/ui/` and appear in the styleguide in both themes.

- **Button** — primary (follows the tint), secondary, ghost, destructive, live;
  sizes 48, 40 and 32 px tall; loading shows a spinner and blocks presses;
  presses scale to 97%.
- **ListRow** — leading icon, title and subtitle, right-aligned value and
  change; at least 56 px tall; becomes a button when it navigates.
- **Card** — surface, hairline border, soft shadow; interactive cards lift 1 px
  on hover.
- **SegmentedControl** — native radios with a sliding thumb, for chart ranges
  and toggles between two to five options.
- **Tabs** — a tablist with a sliding tinted underline and roving focus.
- **Sheet** — bottom sheet on phones, dragged down to dismiss; centered dialog
  from 640 px up. Built on the native modal dialog, so the page behind is inert
  and focus stays inside. Escape, the close button and a tap on the scrim all
  close it.
- **Toast** — short confirmations at the top, newest first, at most three,
  gone after about three seconds, announced politely to screen readers.
- **Skeleton** — a softly pulsing block shaped like the content it replaces.
- **TokenIcon** and **Avatar** — monograms colored from the symbol or address
  itself, so the same token or account always looks the same.
- **Badge** — status pills (gain, loss, live, warn, accent) and splash-colored
  category chips.
- **Switch** and **Slider** — the slider is custom so leverage and price-shock
  controls look the same on every browser; it supports arrows, Page Up/Down,
  Home and End.

## Icons

`lucide-react` line icons at three token sizes: `sm` 16 px (inside small
controls such as a sheet's close button), `md` 20 px (rows, buttons, toasts)
and `lg` 24 px (the phone tab bar), all with a 1.75 px stroke so they read as
one family. Use the `icon()` helper, which also hides the icon from screen
readers. Icons never carry meaning alone; the control they sit in has a text
label or an `aria-label`.

## Motion presets

`motion` springs and tweens come from `src/tokens/motion.ts`: `spring.snappy`
for thumbs and indicators, `spring.settle` for things returning after a drag,
`spring.sheet` for sheets arriving, and `tween(duration, easing)`, which turns
the CSS duration and easing tokens into what `motion` expects. A lint rule
rejects inline `stiffness`, `damping`, numeric `duration` and bezier arrays
anywhere else.
