/**
 * One URL for every route the router knows, by its pattern. A unit test
 * (src/app/audited-routes.test.ts) fails when a route is added without one.
 */
export const auditedRoutes: readonly { readonly route: string; readonly url: string }[] = [
  { route: "/", url: "/" },
  { route: "trade", url: "/trade" },
  { route: "launch", url: "/launch" },
  { route: "activity", url: "/activity" },
  { route: "settings", url: "/settings" },
  { route: "earn", url: "/earn" },
  { route: "perps", url: "/perps?market=BTC-PERP" },
  { route: "tax", url: "/tax" },
  { route: "earnings", url: "/earnings" },
  { route: "earnings/:slug", url: "/earnings/rh-NVDA" },
  { route: "rooms/:slug", url: "/rooms/rh-NVDA" },
  { route: "agent", url: "/agent" },
  { route: "guardrails", url: "/guardrails" },
  { route: "verify", url: "/verify?card=bm9uc2Vuc2U&sig=0x1" },
  { route: "tendies", url: "/tendies" },
  { route: "transfer", url: "/transfer" },
  { route: "bridge", url: "/bridge" },
  { route: "swap", url: "/swap" },
  { route: "send", url: "/send?to=stonks.rh&asset=rh%3AUSDG&amount=5" },
  { route: "receive", url: "/receive" },
  { route: "collectibles", url: "/collectibles" },
  { route: "collectibles/:id", url: "/collectibles/chainlets-412" },
  { route: "inbox", url: "/inbox" },
  { route: "security", url: "/security" },
  { route: "approvals", url: "/approvals" },
  { route: "browse", url: "/browse" },
  { route: "connected-sites", url: "/connected-sites" },
  { route: "browse/:id", url: "/browse/lendwell" },
  { route: "asset/:slug", url: "/asset/rh-NVDA" },
  { route: "*", url: "/no-such-page" },
  { route: "/welcome", url: "/welcome" },
  { route: "/styleguide", url: "/styleguide" },
];

/** Extra URLs worth auditing: other states of a route already listed. */
export const extraAuditUrls: readonly string[] = [
  "/asset/rh-CHIPDOG",
  "/rooms/rh-MSFT",
  "/browse/hood-swap-clone",
];
