import { describe, expect, it } from "vitest";
import { assetById, assets } from "../../data/assets";
import { parseRule } from "../../domain/agent/grammar";
import { testProviders } from "../../test/providers";
import { guardrailsStore } from "../guardrails/guardrails-store";
import { registerGuardrails } from "../guardrails/register";
import { agentStore } from "./agent-store";
import { grantKey, revokeAll } from "./runner";

// 2026-09-29 is a Tuesday; Friday's run is at 15:00 UTC on 2026-10-02.
const start = new Date("2026-09-29T16:00:00Z");
const toFriday = new Date("2026-10-02T15:00:00Z").getTime() - start.getTime();
const lookup = (symbol: string) => assets.find((a) => a.symbol === symbol)?.id;
const flush = async () => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};

function grant(p: ReturnType<typeof testProviders>, prompt: string) {
  const parsed = parseRule(prompt, p.clock.now(), lookup);
  if (!parsed.ok) throw new Error(parsed.reason);
  return grantKey(p, "main", prompt, parsed.rule);
}

/** Moves the clock to `ms` from now and lets a triggered run settle on the chain. */
async function runFor(p: ReturnType<typeof testProviders>, ms: number) {
  p.clock.advance(ms);
  await flush();
  p.clock.advance(350);
  await flush();
  p.clock.advance(1400);
  await flush();
}

const held = (p: ReturnType<typeof testProviders>, id: string) =>
  p.chain.balances("main").find((h) => h.assetId === id)?.quantity.base ?? 0n;

describe("agent runner", () => {
  it("buys on schedule with no prompt to sign, then books the next run", async () => {
    const p = testProviders(start);
    const before = held(p, "rh:NVDA");
    const id = grant(p, "buy $50 of NVDA every Friday");
    expect(agentStore.get().keys[0]?.nextAt?.toISOString()).toBe("2026-10-02T15:00:00.000Z");
    await runFor(p, toFriday);
    expect(held(p, "rh:NVDA")).toBeGreaterThan(before);
    const [entry] = agentStore.get().feed;
    expect(entry).toMatchObject({
      keyId: id,
      outcome: "done",
      summary: { verb: "Bought", detail: "by your agent" },
    });
    expect(agentStore.get().keys[0]).toMatchObject({ spentCents: 5_000n });
    expect(agentStore.get().keys[0]?.nextAt?.toISOString()).toBe("2026-10-09T15:00:00.000Z");
  });

  it("stops the next scheduled run when the kill switch is pressed", async () => {
    const p = testProviders(start);
    const before = held(p, "rh:NVDA");
    grant(p, "buy $50 of NVDA every Friday");
    revokeAll();
    await runFor(p, toFriday);
    expect(held(p, "rh:NVDA")).toBe(before);
    expect(agentStore.get().feed).toEqual([]);
    expect(agentStore.get().keys[0]).toMatchObject({ revoked: true, nextAt: undefined });
  });

  it("skips a run whose condition isn't met, and says why", async () => {
    const p = testProviders(start);
    grant(p, "buy $50 of NVDA every Friday if it drops below $1");
    await runFor(p, toFriday);
    expect(agentStore.get().feed[0]).toMatchObject({ outcome: "skipped" });
    expect(agentStore.get().feed[0]?.note).toMatch(
      /^Condition not met: NVDA at \$[\d,.]+, limit \$1\.00\.$/,
    );
  });

  it("stays inside the key's spend cap", async () => {
    const p = testProviders(start);
    grant(p, "buy $50 of NVDA every day up to $50");
    await runFor(p, new Date("2026-09-30T15:00:00Z").getTime() - start.getTime());
    await runFor(p, 24 * 60 * 60 * 1000 - 1750);
    expect(agentStore.get().feed.map((e) => e.outcome)).toEqual(["skipped", "done"]);
    expect(agentStore.get().feed[0]?.note).toBe("That would pass the key's spend cap.");
  });

  it("is held by the user's guardrails like any other trade", async () => {
    const p = testProviders(start);
    registerGuardrails(() => p);
    guardrailsStore.set({ memeBudgetCents: 1_000n });
    grant(p, "buy $50 of CHIPDOG every Friday");
    await runFor(p, toFriday);
    expect(agentStore.get().feed[0]).toMatchObject({ outcome: "held" });
    expect(agentStore.get().feed[0]?.note).toMatch(/weekly meme budget/);
    expect(assetById("rh:CHIPDOG").kind).toBe("meme");
  });

  it("waits for a take-profit's gain before selling", async () => {
    const p = testProviders(start);
    grant(p, "sell 25% of NVDA when it is up 900%");
    await runFor(p, new Date("2026-09-30T15:00:00Z").getTime() - start.getTime());
    expect(agentStore.get().feed[0]?.note).toMatch(/^Up -?\d+(\.\d+)?%, waiting for 900%\.$/);
  });
});
