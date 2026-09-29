import { describe, expect, it } from "vitest";
import { describeRule } from "./describe";
import { examples, parseRule } from "./grammar";
import { describeCadence, nextRun } from "./schedule";
import { keyPermits, type SessionKey } from "./session-key";

const now = new Date("2026-09-29T16:00:00Z"); // a Tuesday
const DAY = 24 * 60 * 60 * 1000;
const known = new Set(["NVDA", "CHIPDOG", "ETH"]);
const lookup = (symbol: string) => (known.has(symbol) ? `rh:${symbol}` : undefined);
const parse = (prompt: string) => parseRule(prompt, now, lookup);

describe("parseRule", () => {
  it.each([
    [
      examples.buy,
      {
        intent: "buy",
        assetId: "rh:NVDA",
        amountCents: 5_000n,
        cadence: { kind: "weekly", weekday: 5 },
        condition: { kind: "below-average", days: 50 },
        capCents: 20_000n,
        expiresAt: new Date(now.getTime() + 30 * DAY),
      },
    ],
    [
      "Buy $12.50 of eth every day up to $100 for 2 weeks.",
      {
        intent: "buy",
        assetId: "rh:ETH",
        amountCents: 1_250n,
        cadence: { kind: "daily" },
        condition: undefined,
        capCents: 10_000n,
        expiresAt: new Date(now.getTime() + 14 * DAY),
      },
    ],
    [
      "buy $20 of NVDA monthly if it drops below $150",
      {
        intent: "buy",
        assetId: "rh:NVDA",
        amountCents: 2_000n,
        cadence: { kind: "monthly" },
        condition: { kind: "below-price", priceCents: 15_000n },
        capCents: 2_000n,
        expiresAt: new Date(now.getTime() + 30 * DAY),
      },
    ],
    [
      "buy $5 in chipdog every monday if it is down 5% today",
      {
        intent: "buy",
        assetId: "rh:CHIPDOG",
        amountCents: 500n,
        cadence: { kind: "weekly", weekday: 1 },
        condition: { kind: "down-today", bps: 500n },
        capCents: 2_000n,
        expiresAt: new Date(now.getTime() + 30 * DAY),
      },
    ],
    [
      examples["take-profit"],
      {
        intent: "take-profit",
        assetId: "rh:CHIPDOG",
        sellPercent: 25,
        gainBps: 5_000n,
        expiresAt: new Date(now.getTime() + 30 * DAY),
      },
    ],
    [
      examples.rebalance,
      {
        intent: "rebalance",
        cadence: { kind: "monthly" },
        expiresAt: new Date(now.getTime() + 30 * DAY),
      },
    ],
  ])("compiles %j", (prompt, rule) => {
    expect(parse(prompt)).toEqual({ ok: true, rule });
  });

  it.each([
    ["buy $50 of FOO every Friday", /I don't know "FOO"/, examples.buy],
    ["buy $0 of NVDA every day", /above \$0/, examples.buy],
    ["buy $50 of NVDA every fortnight", /"every fortnight" isn't a schedule/, examples.buy],
    ["buy $50 of NVDA every Friday if the moon is full", /isn't a condition/, examples.buy],
    ["buy NVDA whenever it feels right", /recurring buys of a dollar amount/, examples.buy],
    ["sell 150% of NVDA when it is up 20%", /between 1% and 100%/, examples["take-profit"]],
    ["sell everything now", /share of a holding/, examples["take-profit"]],
    [
      "rebalance my Tendies Index every hour",
      /every week or every month|Try every/,
      examples.rebalance,
    ],
    ["transfer all my ETH to 0xabc", /outside what I can do/, examples.buy],
    ["", /outside what I can do/, examples.buy],
  ])("rejects %j, naming the closest form", (prompt, reason, example) => {
    const result = parse(prompt);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(reason);
      expect(result.example).toBe(example);
    }
  });
});

describe("nextRun", () => {
  it.each([
    [{ kind: "daily" } as const, "2026-09-29T16:00:00Z", "2026-09-30T15:00:00.000Z"],
    [{ kind: "daily" } as const, "2026-09-29T14:00:00Z", "2026-09-29T15:00:00.000Z"],
    [{ kind: "weekly", weekday: 5 } as const, "2026-09-29T16:00:00Z", "2026-10-02T15:00:00.000Z"],
    [{ kind: "weekly", weekday: 2 } as const, "2026-09-29T16:00:00Z", "2026-10-06T15:00:00.000Z"],
    [{ kind: "monthly" } as const, "2026-09-29T16:00:00Z", "2026-10-01T15:00:00.000Z"],
    [{ kind: "monthly" } as const, "2026-12-01T15:00:00Z", "2027-01-01T15:00:00.000Z"],
  ])("%j after %s is %s", (cadence, after, next) => {
    expect(nextRun(cadence, new Date(after)).toISOString()).toBe(next);
  });

  it("describes each cadence", () => {
    expect(describeCadence({ kind: "weekly", weekday: 5 })).toBe("every Friday");
    expect(describeCadence({ kind: "daily" })).toBe("every day");
    expect(describeCadence({ kind: "monthly" })).toBe("on the 1st of each month");
  });
});

describe("keyPermits", () => {
  const parsed = parse("buy $50 of NVDA every Friday up to $120");
  if (!parsed.ok) throw new Error("fixture");
  const key: SessionKey = { rule: parsed.rule, grantedAt: now, revoked: false, spentCents: 0n };
  const buy = (spendCents: bigint, assetId = "rh:NVDA") => ({
    assetId,
    side: "buy" as const,
    spendCents,
  });

  it.each([
    ["a buy within the rule", key, buy(5_000n), undefined],
    ["a revoked key", { ...key, revoked: true }, buy(5_000n), "The key was revoked."],
    ["another asset", key, buy(5_000n, "rh:ETH"), "This key doesn't cover that asset."],
    ["more than a run", key, buy(5_001n), "That's more than the key allows per run."],
    [
      "past the cap",
      { ...key, spentCents: 10_000n },
      buy(5_000n),
      "That would pass the key's spend cap.",
    ],
    [
      "a sell",
      key,
      { assetId: "rh:NVDA", side: "sell" as const, spendCents: 0n },
      "This key only buys.",
    ],
  ])("%s", (_name, k, action, reason) => {
    expect(keyPermits(k, action, now)).toBe(reason);
  });

  it("expires", () => {
    expect(keyPermits(key, buy(1n), new Date(now.getTime() + 31 * DAY))).toBe(
      "The key has expired.",
    );
  });
});

describe("describeRule", () => {
  const symbolOf = (id: string) => id.replace("rh:", "");
  it("lists a conditional buy's scope in order", () => {
    const parsed = parse(examples.buy);
    if (!parsed.ok) throw new Error("fixture");
    expect(describeRule(parsed.rule, symbolOf)).toEqual([
      { label: "Action", value: "Buy $50.00 of NVDA" },
      { label: "When", value: "every Friday" },
      { label: "Only if", value: "NVDA is under its 50-day average" },
      { label: "Spend cap", value: "$200.00 in total" },
      { label: "Expires", value: "Oct 29, 2026" },
    ]);
  });

  it("describes a take-profit and a rebalance", () => {
    const tp = parse(examples["take-profit"]);
    const rb = parse(examples.rebalance);
    if (!tp.ok || !rb.ok) throw new Error("fixture");
    expect(describeRule(tp.rule, symbolOf)[1]).toEqual({
      label: "When",
      value: "once it is up 50.00%, checked daily",
    });
    expect(describeRule(rb.rule, symbolOf)[0]).toEqual({
      label: "Action",
      value: "Rebalance your Tendies Index",
    });
  });
});
