/**
 * Every page without a parameter, with the words people use for it. The command
 * palette lists these; a test checks the list against the router's own table,
 * so a new route cannot be left out.
 */
export const destinations: readonly {
  readonly path: string;
  readonly title: string;
  readonly keywords: string;
}[] = [
  { path: "/", title: "Home", keywords: "portfolio balance total" },
  { path: "/trade", title: "Trade", keywords: "stock tokens buy sell" },
  { path: "/launch", title: "Launch", keywords: "memes curve new tokens" },
  { path: "/activity", title: "Activity", keywords: "history transactions" },
  { path: "/settings", title: "Settings", keywords: "preferences theme currency" },
  { path: "/earn", title: "Earn", keywords: "vault yield usdg interest" },
  { path: "/perps", title: "Perps", keywords: "leverage long short futures" },
  { path: "/tax", title: "Tax lots", keywords: "fifo csv export realized" },
  { path: "/earnings", title: "Earnings calendar", keywords: "reports sweat" },
  { path: "/agent", title: "Agent", keywords: "automate recurring rules" },
  { path: "/guardrails", title: "Guardrails", keywords: "limits budget leverage cap" },
  { path: "/verify", title: "Verify a card", keywords: "flex signature check" },
  { path: "/tendies", title: "Tendies Index", keywords: "basket weights rebalance" },
  { path: "/transfer", title: "Robinhood account", keywords: "rail deposit withdraw cash" },
  { path: "/bridge", title: "Bridge", keywords: "move chains solana arbitrum base" },
  { path: "/swap", title: "Swap", keywords: "exchange convert" },
  { path: "/send", title: "Send", keywords: "pay transfer" },
  { path: "/receive", title: "Receive", keywords: "qr address request" },
  { path: "/collectibles", title: "Collectibles", keywords: "nfts art spam" },
  { path: "/inbox", title: "Inbox", keywords: "notifications alerts" },
  { path: "/security", title: "Security", keywords: "score checklist" },
  { path: "/approvals", title: "Approvals", keywords: "revoke allowances spenders" },
  { path: "/browse", title: "Apps", keywords: "dapps browser sites" },
  { path: "/connected-sites", title: "Connected sites", keywords: "dapps disconnect" },
  { path: "/styleguide", title: "Styleguide", keywords: "tokens components design" },
];
