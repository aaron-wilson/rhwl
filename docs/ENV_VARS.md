# Environment variables

What this is: every environment variable the app reads, what it does, and the
format it expects. Read it before configuring a deploy or adding a variable.
Every variable is optional. With none set, a fresh clone runs entirely on
built-in demo data, which is also how the public demo is deployed.

All variables are read once, in `src/config/env.ts`, and validated there. They
use Vite's `VITE_` prefix, which means they are compiled into the public
JavaScript bundle. Never put a secret in one.

| Name             | Purpose                                                          | Values                                                                                                                           | Default   |
| ---------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `VITE_CLOCK`     | Where the app's time comes from                                  | `demo`: a clock presenter mode can freeze, fast-forward or start at a chosen instant. `browser`: real time only                  | `demo`    |
| `VITE_STORAGE`   | Where preferences (theme, hidden balances) are kept              | `browser`: localStorage, survives reloads (plus sessionStorage for the one-tab chunk reload mark). `memory`: forgotten on reload | `browser` |
| `VITE_HAPTICS`   | Physical feedback on actions                                     | `browser`: the Vibration API where the device has it, otherwise silent. `demo`: recorded, never felt                             | `browser` |
| `VITE_SHARE`     | How flex cards and links leave the app                           | `browser`: the system share sheet, or the clipboard where there is none. `demo`: recorded only                                   | `browser` |
| `VITE_CLIPBOARD` | Where Copy puts addresses and links                              | `browser`: the system clipboard. `demo`: recorded only                                                                           | `browser` |
| `VITE_REPORTER`  | Where unexpected errors, such as a page that threw, are reported | `browser`: the console. `demo`: recorded, silent                                                                                 | `browser` |

Set them in a local `.env` file (never committed) or in the Vercel project's
Environment Variables settings, then rebuild. `.env.example` lists every
variable with a comment.
