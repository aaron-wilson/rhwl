import type { Cadence, Condition, ParseResult } from "./rule";

/** Example prompts, one per intent; also shown when a prompt is not understood. */
export const examples = {
  buy: "buy $50 of NVDA every Friday if it is under its 50-day average",
  "take-profit": "sell 25% of CHIPDOG when it is up 50%",
  rebalance: "rebalance my Tendies Index every month",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Runs a cadence makes per 30 days, for the default spend cap. */
const runsPerMonth = (c: Cadence) => (c.kind === "daily" ? 30 : c.kind === "weekly" ? 4 : 1);

const cents = (dollars: string) => {
  const [whole = "0", frac = ""] = dollars.split(".");
  return BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0").slice(0, 2));
};

function cadenceOf(text: string): Cadence | undefined {
  if (text === "every day" || text === "daily") return { kind: "daily" };
  if (text === "every week" || text === "weekly") return { kind: "weekly", weekday: 5 };
  if (text === "every month" || text === "monthly") return { kind: "monthly" };
  const day = /^every (\w+)$/.exec(text)?.[1];
  const weekday = day === undefined ? -1 : WEEKDAYS.indexOf(day);
  return weekday === -1 ? undefined : { kind: "weekly", weekday };
}

function conditionOf(text: string): Condition | undefined {
  const average = /^it is (?:under|below) its (\d{1,3})[- ]day average$/.exec(text);
  if (average?.[1] !== undefined) return { kind: "below-average", days: Number(average[1]) };
  const price = /^it (?:is|drops|falls) (?:under|below) \$(\d+(?:\.\d{1,2})?)$/.exec(text);
  if (price?.[1] !== undefined) return { kind: "below-price", priceCents: cents(price[1]) };
  const down = /^it is down (\d{1,2})% today$/.exec(text);
  if (down?.[1] !== undefined) return { kind: "down-today", bps: BigInt(down[1]) * 100n };
  return undefined;
}

const CADENCE = "(every day|daily|every week|weekly|every month|monthly|every \\w+)";
const BUY = new RegExp(
  `^buy \\$(\\d+(?:\\.\\d{1,2})?) (?:of|in) ([a-z]+) ${CADENCE}(?: if (.+))?$`,
);
const TAKE_PROFIT = /^sell (\d{1,3})% of ([a-z]+) (?:when|if) it is up (\d{1,4})%$/;
const REBALANCE = new RegExp(`^rebalance (?:my )?(?:tendies index|tendies|basket) ${CADENCE}$`);

/**
 * Turns one prompt into a rule, or says why it can't, naming the closest
 * supported form. Deterministic: no model, no network. Optional tails:
 * "up to $200" caps total spend, "for 2 weeks" sets the expiry (default 30 days).
 */
export function parseRule(
  prompt: string,
  now: Date,
  symbolToId: (symbol: string) => string | undefined,
): ParseResult {
  let text = prompt.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!]$/, "");
  let capCents: bigint | undefined;
  let days = 30;
  const cap = / up to \$(\d+(?:\.\d{1,2})?)(?: in total)?/.exec(text);
  if (cap?.[1] !== undefined) {
    capCents = cents(cap[1]);
    text = text.replace(cap[0], "");
  }
  const span = / for (\d{1,3}) (day|days|week|weeks|month|months)$/.exec(text);
  if (span?.[1] !== undefined && span[2] !== undefined) {
    const n = Number(span[1]);
    days = span[2].startsWith("day") ? n : span[2].startsWith("week") ? n * 7 : n * 30;
    text = text.slice(0, span.index);
  }
  const expiresAt = new Date(now.getTime() + days * DAY_MS);
  const fail = (reason: string, intent: keyof typeof examples): ParseResult => ({
    ok: false,
    reason,
    example: examples[intent],
  });
  const asset = (symbol: string) => symbolToId(symbol.toUpperCase());

  const buy = BUY.exec(text);
  if (buy !== null) {
    const [, dollars = "0", symbol = "", when = "", condition] = buy;
    const assetId = asset(symbol);
    if (assetId === undefined)
      return fail(`I don't know "${symbol.toUpperCase()}". Use a ticker like NVDA.`, "buy");
    const amountCents = cents(dollars);
    if (amountCents <= 0n) return fail("The amount must be above $0.", "buy");
    const cadence = cadenceOf(when);
    if (cadence === undefined)
      return fail(
        `"${when}" isn't a schedule I know. Try every day, every Friday or every month.`,
        "buy",
      );
    const parsed = condition === undefined ? undefined : conditionOf(condition);
    if (condition !== undefined && parsed === undefined) {
      return fail(
        `"if ${condition}" isn't a condition I know. Try "if it is under its 50-day average".`,
        "buy",
      );
    }
    return {
      ok: true,
      rule: {
        intent: "buy",
        assetId,
        amountCents,
        cadence,
        condition: parsed,
        capCents: capCents ?? amountCents * BigInt(Math.ceil((runsPerMonth(cadence) * days) / 30)),
        expiresAt,
      },
    };
  }

  const tp = TAKE_PROFIT.exec(text);
  if (tp !== null) {
    const [, percent = "0", symbol = "", gain = "0"] = tp;
    const assetId = asset(symbol);
    if (assetId === undefined)
      return fail(
        `I don't know "${symbol.toUpperCase()}". Use a ticker like CHIPDOG.`,
        "take-profit",
      );
    const sellPercent = Number(percent);
    if (sellPercent < 1 || sellPercent > 100)
      return fail("Sell between 1% and 100%.", "take-profit");
    if (Number(gain) < 1) return fail("The gain must be at least 1%.", "take-profit");
    return {
      ok: true,
      rule: {
        intent: "take-profit",
        assetId,
        sellPercent,
        gainBps: BigInt(gain) * 100n,
        expiresAt,
      },
    };
  }

  const rebalance = REBALANCE.exec(text);
  if (rebalance !== null) {
    const cadence = cadenceOf(rebalance[1] ?? "");
    if (cadence === undefined) return fail("Try every week or every month.", "rebalance");
    return { ok: true, rule: { intent: "rebalance", cadence, expiresAt } };
  }

  if (text.startsWith("buy")) return fail("I can do recurring buys of a dollar amount.", "buy");
  if (text.startsWith("sell"))
    return fail("I can sell a share of a holding once it is up by a percentage.", "take-profit");
  if (text.startsWith("rebalance"))
    return fail("I can rebalance your Tendies Index on a schedule.", "rebalance");
  return fail("That's outside what I can do: recurring buys, take-profits and rebalancing.", "buy");
}
