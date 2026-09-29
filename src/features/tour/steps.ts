/** One stop on the guided tour: a page, the element to light up, and what to say. */
export interface TourStep {
  readonly path: string;
  /** A selector for the element the spotlight frames; always present on that page. */
  readonly target: string;
  readonly title: string;
  readonly body: string;
}

/** The features only this wallet has, in the order a pitch tells them. */
export const tourSteps: readonly TourStep[] = [
  {
    path: "/",
    target: '[data-testid="portfolio-total"]',
    title: "Stocks, crypto and memes in one wallet",
    body: "Stock Tokens on Robinhood Chain sit beside crypto and memes, valued live on one clock.",
  },
  {
    path: "/asset/rh-NVDA",
    target: 'section[aria-labelledby="market-clock"]',
    title: "Trading around the clock",
    body: "The market clock shows whether the listing is open and the token's premium or discount to it.",
  },
  {
    path: "/tendies",
    target: 'section[aria-labelledby="basket-members"]',
    title: "A whole basket in one signature",
    body: "Pick weights, and every leg is bought or rebalanced in a single transaction.",
  },
  {
    path: "/agent",
    target: "main form",
    title: "An agent you can read",
    body: "Plain sentences become rules with a signed scope; the agent can never exceed it.",
  },
  {
    path: "/guardrails",
    target: "main h1",
    title: "Limits you set for yourself",
    body: "A meme budget, a leverage cap and a wait before big trades, checked before every signature.",
  },
  {
    path: "/earnings",
    target: 'ul[aria-label="Earnings calendar"]',
    title: "Earnings nights",
    body: "Everything riding on a report, token, paired memes and perps, with a what-if slider.",
  },
  {
    path: "/rooms/rh-NVDA",
    // The heading is the one element a holder, a joined member and an outsider all see.
    target: "main h1",
    title: "Rooms for real holders",
    body: "Join by signing; the badge comes from how long you have held.",
  },
  {
    path: "/browse",
    target: 'form[role="search"]',
    title: "Sites, with the risks spelled out",
    body: "Every request is decoded and dry-run; lookalike sites are blocked full screen.",
  },
  {
    path: "/security",
    target: '[role="meter"]',
    title: "A score with one-tap fixes",
    body: "Backup, lock, guardrails, approvals and poisoned addresses, each fixed from here.",
  },
];
