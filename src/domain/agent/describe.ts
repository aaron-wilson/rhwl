import { formatFiat, formatPercentBps } from "../money/format";
import type { AgentRule, Condition } from "./rule";
import { describeCadence } from "./schedule";

const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

function describeCondition(c: Condition, symbol: string): string {
  if (c.kind === "below-average") return `${symbol} is under its ${c.days}-day average`;
  if (c.kind === "below-price") return `${symbol} is below ${formatFiat(c.priceCents)}`;
  return `${symbol} is down ${formatPercentBps(c.bps, "negative")} or more today`;
}

/** The policy card's rows: what the key allows, in plain words, in a fixed order. */
export function describeRule(
  rule: AgentRule,
  symbolOf: (assetId: string) => string,
): readonly { readonly label: string; readonly value: string }[] {
  const expiry = { label: "Expires", value: day.format(rule.expiresAt) };
  if (rule.intent === "rebalance") {
    return [
      { label: "Action", value: "Rebalance your Tendies Index" },
      { label: "When", value: describeCadence(rule.cadence) },
      expiry,
    ];
  }
  const symbol = symbolOf(rule.assetId);
  if (rule.intent === "take-profit") {
    return [
      { label: "Action", value: `Sell ${rule.sellPercent}% of ${symbol}` },
      {
        label: "When",
        value: `once it is up ${formatPercentBps(rule.gainBps, "negative")}, checked daily`,
      },
      expiry,
    ];
  }
  return [
    { label: "Action", value: `Buy ${formatFiat(rule.amountCents)} of ${symbol}` },
    { label: "When", value: describeCadence(rule.cadence) },
    ...(rule.condition === undefined
      ? []
      : [{ label: "Only if", value: describeCondition(rule.condition, symbol) }]),
    { label: "Spend cap", value: `${formatFiat(rule.capCents)} in total` },
    expiry,
  ];
}
