/**
 * Catalog anchor prices are the prices at this instant (the Friday close before
 * the demo's default week). The demo market walks away from them in both directions.
 */
export const ANCHOR_AT = new Date("2026-09-25T20:00:00Z");

/** The default seed for the fake world. Any other string gives a different, equally stable world. */
export const DEFAULT_SEED = "rhwl";

/**
 * When the demo pretends each account's opening balances were bought. Cost
 * basis values those balances at this instant's prices (the Friday close four
 * weeks before the anchor).
 */
export const OPENING_AT = new Date("2026-08-28T20:00:00Z");
